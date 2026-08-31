import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import {
  CANONICAL_DASHBOARD_DISPLAY_VERSION,
  CANONICAL_DASHBOARD_POLICY_VERSION,
  CANONICAL_DASHBOARD_PROJECTION_VERSION,
  CANONICAL_DASHBOARD_ZONE_RULE_VERSION,
} from '@elceo/chart-intelligence';
import {
  CanonicalKickOffContextMaterializationService,
  FencedMaterializationRepository,
  RedisAdaptiveOwnershipStore,
  SqlImmutableMaterializationStore,
  buildArtifactIntegrityHash,
  buildDashboardProjectionCoordinationHash,
  buildKickOffContextCoordinationHash,
  buildMaterializationScopeHash,
  createAdaptiveMaterializationRedisClient,
  createProductionCanonicalDashboardProjectionReader,
  createProductionCanonicalKickOffContextReader,
  projectKickOffDashboard,
} from '../adaptive-materialization/index.js';
import type { AdaptiveOwnershipStore, MaterializationLease, MaterializationRepository } from '../adaptive-materialization/contracts.js';
import { fixture } from './kick-off-dashboard-contract.test.js';

type RedisClient=ReturnType<typeof createAdaptiveMaterializationRedisClient>;
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const deferred=()=>{let resolve!:()=>void;const promise=new Promise<void>(done=>{resolve=done});return{promise,resolve}};
const asSqlPool=(pool:Pool)=>({query:async(sql:string,params?:unknown[])=>({rows:(await pool.query(sql,params)).rows.map(row=>({artifact_json:String(row.artifact_json)}))})});
const closeClient=async(client:RedisClient|undefined)=>{if(client?.isOpen)await client.quit()};

class PublishBarrierRepository implements MaterializationRepository{
  readonly reached=deferred();readonly release=deferred();
  constructor(private readonly delegate:MaterializationRepository){}
  getByIdentity<T>(identity:string){return this.delegate.getByIdentity<T>(identity)}
  readCurrent<T>(coordinationHash:string,scopeHash:string){return this.delegate.readCurrent<T>(coordinationHash,scopeHash)}
  async publish(lease:MaterializationLease,artifact:Parameters<MaterializationRepository['publish']>[1]){this.reached.resolve();await this.release.promise;return this.delegate.publish(lease,artifact as never)}
}

class AcquireObserver implements AdaptiveOwnershipStore{
  readonly kind='redis' as const;readonly followerBlocked=deferred();readonly resume=deferred();
  constructor(private readonly delegate:AdaptiveOwnershipStore){}
  acquire(...args:Parameters<AdaptiveOwnershipStore['acquire']>){return this.delegate.acquire(...args)}
  async acquireMaterialization(...args:Parameters<AdaptiveOwnershipStore['acquireMaterialization']>){const result=await this.delegate.acquireMaterialization(...args);if(!result.acquired){this.followerBlocked.resolve();await this.resume.promise}return result}
  renew(...args:Parameters<AdaptiveOwnershipStore['renew']>){return this.delegate.renew(...args)}
  complete(...args:Parameters<AdaptiveOwnershipStore['complete']>){return this.delegate.complete(...args)}
  defer(...args:Parameters<AdaptiveOwnershipStore['defer']>){return this.delegate.defer(...args)}
  deferBounded(...args:Parameters<AdaptiveOwnershipStore['deferBounded']>){return this.delegate.deferBounded(...args)}
  publishCurrent(...args:Parameters<AdaptiveOwnershipStore['publishCurrent']>){return this.delegate.publishCurrent(...args)}
  readCurrentIdentity(...args:Parameters<AdaptiveOwnershipStore['readCurrentIdentity']>){return this.delegate.readCurrentIdentity(...args)}
  readMaterializationCompletion(...args:Parameters<NonNullable<AdaptiveOwnershipStore['readMaterializationCompletion']>>){return this.delegate.readMaterializationCompletion!(...args)}
  release(...args:Parameters<AdaptiveOwnershipStore['release']>){return this.delegate.release(...args)}
  isCurrent(...args:Parameters<AdaptiveOwnershipStore['isCurrent']>){return this.delegate.isCurrent(...args)}
  close(){return this.delegate.close()}
}

export async function runKickOffProductionIntegrationTests(){
 if(process.env.KICK_OFF_PRODUCTION_INTEGRATION!=='1')return;
 if(!process.env.DATABASE_URL||!process.env.REDIS_URL)throw new Error('kick_off_production_integration_requires_DATABASE_URL_and_REDIS_URL');
 const namespace=`elceo:kick-off:integration:${process.pid}:${Date.now()}`,pool=new Pool({connectionString:process.env.DATABASE_URL}),pools=[pool],clients:RedisClient[]=[],ownedIdentities=new Set<string>(),ownedParentIdentities=new Set<string>();
 const client=()=>{const value=createAdaptiveMaterializationRedisClient();clients.push(value);return value};
 const readerPool=()=>{const value=new Pool({connectionString:process.env.DATABASE_URL});pools.push(value);return value};
 const stack=(suffix:string)=>{const redis=client(),ownership=new RedisAdaptiveOwnershipStore(redis,`${namespace}:${suffix}`),immutable=new SqlImmutableMaterializationStore(asSqlPool(pool)),repository=new FencedMaterializationRepository(ownership,immutable);return{redis,ownership,immutable,repository,namespace:`${namespace}:${suffix}`}};
 const materializeInput=(base:ReturnType<typeof fixture>,leaseDurationMs=1500)=>({asset:'XAU/USD' as const,dashboardArtifactIdentity:base.dashboard.identity,cognitionArtifactIdentity:base.cognition.identity,aggregate:base.aggregate,leaseDurationMs,retryMaximumMs:5000});
 try{
  const materializationTable=await pool.query("SELECT to_regclass('app_canonical_materializations') AS name");if(!materializationTable.rows[0]?.name)for(const migration of ['0050_adaptive_materialization.sql','0051_dashboard_projection_materialization.sql'])await pool.query(await readFile(`../../infra/db/schema/${migration}`,'utf8'));await pool.query(await readFile('../../infra/db/schema/0053_kick_off_dashboard_context_materialization.sql','utf8'));
  const epoch=Math.floor(Date.now()/60_000)*60_000,dashboardVersions={projectionVersion:CANONICAL_DASHBOARD_PROJECTION_VERSION,displayVersion:CANONICAL_DASHBOARD_DISPLAY_VERSION,zoneRuleVersion:CANONICAL_DASHBOARD_ZONE_RULE_VERSION,productPolicyVersion:CANONICAL_DASHBOARD_POLICY_VERSION},dashboardScope=buildMaterializationScopeHash({asset:'XAU/USD',horizon:'intraday',timeframe:'H4',kind:'dashboard_projection',...dashboardVersions}),base=fixture(73.428,undefined,{evaluatedAt:new Date(epoch).toISOString(),freshUntil:new Date(epoch+900_000).toISOString()});base.dashboard.scopeHash=dashboardScope;const{integrityHash:oldDashboardIntegrity,...dashboardBody}=base.dashboard;void oldDashboardIntegrity;base.dashboard.integrityHash=buildArtifactIntegrityHash(dashboardBody);const variantBase=(usableWeight:number)=>({...base,aggregate:{...base.aggregate,weightedSnapshot:{...base.aggregate.weightedSnapshot,totalWeight:usableWeight,usableWeight}}}),a1=stack('a1');for(const identity of [base.evidence.identity,base.cognition.identity,base.dashboard.identity])ownedParentIdentities.add(identity);await pool.query('DELETE FROM app_canonical_materializations WHERE identity=ANY($1::text[])',[[...ownedParentIdentities]]);
  await a1.immutable.saveImmutable(base.evidence);await a1.immutable.saveImmutable(base.cognition);await a1.immutable.saveImmutable(base.dashboard);
  assert.ok(await a1.repository.getByIdentity(base.evidence.identity));assert.ok(await a1.repository.getByIdentity(base.cognition.identity));assert.ok(await a1.repository.getByIdentity(base.dashboard.identity));
  const context=await new CanonicalKickOffContextMaterializationService(a1.repository,a1.ownership).materialize(materializeInput(base)),persisted=await a1.immutable.getImmutable(context.identity);
  assert.ok(persisted&&persisted.kind==='kick_off_dashboard_context');assert.equal(persisted.identity,context.identity);assert.equal(persisted.integrityHash,context.integrityHash);assert.equal((persisted.payload as typeof context.payload).evidence_score.value,base.aggregate.weightedSnapshot.usableWeight);assert.equal(persisted.parentDashboardProjectionIdentity,base.dashboard.identity);assert.equal(persisted.parentCognitionArtifactIdentity,base.cognition.identity);assert.deepEqual(persisted.parentEvidenceArtifactIdentities,[base.evidence.identity]);
  const coordination=buildKickOffContextCoordinationHash({asset:'XAU/USD',horizon:'intraday',timeframe:'H4'}),scope=buildMaterializationScopeHash({asset:'XAU/USD',horizon:'intraday',timeframe:'H4',kind:'kick_off_dashboard_context'});assert.equal(await a1.ownership.readCurrentIdentity(coordination,scope),context.identity);
  const reconstructed=stack('a1'),reader=createProductionCanonicalKickOffContextReader({redisClient:reconstructed.redis,sqlPool:asSqlPool(readerPool()),namespace:reconstructed.namespace,cacheLimits:{maxEntries:4,maxSerializedBytes:1_000_000}}),read=await reader.read('XAU/USD','intraday','H4');assert.equal(read.state,'available','A1 reconstructed context');assert.equal(read.artifact?.identity,context.identity);assert.equal(read.artifact?.payload.evidence_score.value,base.aggregate.weightedSnapshot.usableWeight);

  // Two independent producers: A owns the real lease while B deterministically enters the follower path.
  const concurrentA=stack('concurrent'),concurrentB=stack('concurrent'),barrier=new PublishBarrierRepository(concurrentA.repository),observedB=new AcquireObserver(concurrentB.ownership),serviceA=new CanonicalKickOffContextMaterializationService(barrier,concurrentA.ownership),serviceB=new CanonicalKickOffContextMaterializationService(concurrentB.repository,observedB),promiseA=serviceA.materialize(materializeInput(base,3000));
  await barrier.reached.promise;const promiseB=serviceB.materialize(materializeInput(base,3000));await observedB.followerBlocked.promise;barrier.release.resolve();const resultA=await promiseA;observedB.resume.resolve();const resultB=await promiseB;
  assert.equal(resultA.identity,context.identity);assert.equal(resultB.identity,context.identity);assert.equal(resultA.integrityHash,resultB.integrityHash);assert.deepEqual(resultA.payload,resultB.payload);assert.equal(await concurrentA.ownership.readCurrentIdentity(coordination,scope),context.identity);const canonicalRows=await pool.query("SELECT count(*)::int AS count FROM app_canonical_materializations WHERE identity=$1 AND kind='kick_off_dashboard_context'",[context.identity]);assert.equal(Number(canonicalRows.rows[0]?.count),1);
  const concurrentCompletion=await concurrentA.ownership.readMaterializationCompletion(coordination,context.identity,scope);assert.equal(concurrentCompletion?.identity,context.identity);

  // A different valid current artifact in the same scope must never satisfy the expected producer.
  const adjacentBase=variantBase(61.25),wrong=stack('wrong-current'),adjacent=await new CanonicalKickOffContextMaterializationService(wrong.repository,wrong.ownership).materialize(materializeInput(adjacentBase,2000));ownedIdentities.add(adjacent.identity);assert.notEqual(adjacent.identity,context.identity);assert.equal(await wrong.ownership.readCurrentIdentity(coordination,scope),adjacent.identity);
  const blocker=await wrong.ownership.acquireMaterialization(coordination,context.identity,randomUUID(),2000);assert.equal(blocker.acquired,true);if(!blocker.acquired)throw new Error('expected_wrong_current_blocker_lease');const wrongFollower=new CanonicalKickOffContextMaterializationService(wrong.repository,wrong.ownership),expectedPromise=wrongFollower.materialize(materializeInput(base,2000));await sleep(100);assert.equal(await wrong.ownership.readCurrentIdentity(coordination,scope),adjacent.identity);await wrong.ownership.release(blocker.lease);const expected=await expectedPromise;assert.equal(expected.identity,context.identity);assert.equal(await wrong.ownership.readCurrentIdentity(coordination,scope),context.identity);

  // An expired generation may persist immutable provenance, but it cannot advance CURRENT after takeover.
  const staleA=stack('stale'),staleB=stack('stale'),staleBarrier=new PublishBarrierRepository(staleA.repository),staleServiceA=new CanonicalKickOffContextMaterializationService(staleBarrier,staleA.ownership),staleOutcome=staleServiceA.materialize(materializeInput(base,120)).then(artifact=>({artifact,error:null}),error=>({artifact:null,error:error as Error}));await staleBarrier.reached.promise;await sleep(180);const live=await new CanonicalKickOffContextMaterializationService(staleB.repository,staleB.ownership).materialize(materializeInput(base,1000));staleBarrier.release.resolve();const stale=await staleOutcome;assert.equal(stale.artifact,null);assert.match(stale.error?.message??'',/kick_off_context_stale_owner_publish_denied/);assert.equal(live.identity,context.identity);assert.equal(await staleB.ownership.readCurrentIdentity(coordination,scope),context.identity);const liveCompletion=await staleB.ownership.readMaterializationCompletion(coordination,context.identity,scope);assert.equal(liveCompletion?.identity,context.identity);assert.ok((liveCompletion?.generation??0)>=2);

  // Publish D1 through its real fenced pointer, then prove context absence degrades only optional surfaces.
  const degradation=stack('degradation'),dashboardCoordination=buildDashboardProjectionCoordinationHash({asset:'XAU/USD',horizon:'intraday',timeframe:'H4',...dashboardVersions}),dashboardLease=await degradation.ownership.acquireMaterialization(dashboardCoordination,base.dashboard.identity,randomUUID(),2000);assert.equal(dashboardLease.acquired,true);if(!dashboardLease.acquired)throw new Error('expected_dashboard_lease');assert.equal(await degradation.repository.publish(dashboardLease.lease,base.dashboard),true);await degradation.ownership.release(dashboardLease.lease);
  const degradationContext=await new CanonicalKickOffContextMaterializationService(degradation.repository,degradation.ownership).materialize(materializeInput(base,2000));assert.equal(degradationContext.identity,context.identity);
  const freshD1=()=>{const redis=client();return createProductionCanonicalDashboardProjectionReader({redisClient:redis,sqlPool:asSqlPool(readerPool()),namespace:degradation.namespace,cacheLimits:{maxEntries:2,maxSerializedBytes:1_000_000}})};
  const freshContext=()=>{const redis=client();return createProductionCanonicalKickOffContextReader({redisClient:redis,sqlPool:asSqlPool(readerPool()),namespace:degradation.namespace,cacheLimits:{maxEntries:2,maxSerializedBytes:1_000_000}})};
  assert.equal((await freshD1().read('XAU/USD','intraday','H4')).state,'available','initial D1');assert.equal((await freshContext().read('XAU/USD','intraday','H4')).state,'available','initial context');
  const contextPointer=`${degradation.namespace}:{${coordination}}:current:${scope}`;await degradation.redis.del(contextPointer);const missingD1=await freshD1().read('XAU/USD','intraday','H4'),missingContext=await freshContext().read('XAU/USD','intraday','H4');assert.equal(missingD1.state,'available','D1 after missing context');assert.deepEqual(missingD1.artifact?.payload.workspace.chart.candles,base.workspace.chart.candles);assert.deepEqual(missingD1.artifact?.payload.workspace.chart.zones,base.workspace.chart.zones);assert.equal(missingContext.state,'unavailable');
  const missingProjection=projectKickOffDashboard(base.workspace,null,{asset:'XAU/USD',horizon:'intraday',evaluatedAt:base.dashboard.evaluatedAt,features:{evidenceScore:true,macroHeadlines:true}});assert.deepEqual(missingProjection.chart.candles,base.workspace.chart.candles);assert.deepEqual(missingProjection.chart.zones,base.workspace.chart.zones.map((zone:{zone_id:string;lower:number;upper:number;center:number})=>({zone_id:zone.zone_id,lower:zone.lower,upper:zone.upper,center:zone.center})));assert.equal(missingProjection.evidence_score.availability,'unavailable');assert.equal(missingProjection.macro_headlines.availability,'unavailable');

  // Durable JSONB corruption remains pointed-to but is rejected by a brand-new passive reader.
  const tamperBase=variantBase(44.125),tampered=await new CanonicalKickOffContextMaterializationService(degradation.repository,degradation.ownership).materialize(materializeInput(tamperBase,2000));ownedIdentities.add(tampered.identity);assert.notEqual(tampered.identity,context.identity);assert.equal((await freshContext().read('XAU/USD','intraday','H4')).state,'available');
  await pool.query("UPDATE app_canonical_materializations SET artifact_json=jsonb_set(artifact_json,'{payload,evidence_score,value}','99'::jsonb) WHERE identity=$1",[tampered.identity]);const corruptD1=await freshD1().read('XAU/USD','intraday','H4'),corruptContext=await freshContext().read('XAU/USD','intraday','H4');assert.equal(corruptD1.state,'available','D1 after corrupt context');assert.equal(corruptContext.state,'unavailable');assert.equal(corruptContext.artifact,null);
  const corruptProjection=projectKickOffDashboard(base.workspace,null,{asset:'XAU/USD',horizon:'intraday',evaluatedAt:base.dashboard.evaluatedAt,features:{evidenceScore:true,macroHeadlines:true}});assert.deepEqual(corruptProjection.chart,missingProjection.chart);assert.equal(corruptProjection.evidence_score.availability,'unavailable');assert.equal(corruptProjection.macro_headlines.availability,'unavailable');const serialized=JSON.stringify(corruptProjection);for(const denied of ['confidence_total','directional_bias','contradiction','evidence_notes','modules','rationale'])assert.equal(serialized.includes(`"${denied}"`),false);
  console.log(`Kick Off A1+A2 integration passed identity=${context.identity} concurrentGeneration=${concurrentCompletion?.generation} takeoverGeneration=${liveCompletion?.generation}`);
 }finally{
  for(const identity of ownedIdentities)await pool.query("DELETE FROM app_canonical_materializations WHERE identity=$1 AND kind='kick_off_dashboard_context'",[identity]).catch(()=>undefined);
  if(ownedParentIdentities.size)await pool.query('DELETE FROM app_canonical_materializations WHERE identity=ANY($1::text[])',[[...ownedParentIdentities]]).catch(()=>undefined);
  for(const redis of clients)if(redis.isOpen){const keys=await redis.keys(`${namespace}:*`).catch(()=>[]);if(keys.length)await redis.del(keys).catch(()=>undefined)}
  await Promise.all(clients.map(closeClient));await Promise.all(pools.map(value=>value.end()));
 }
}
