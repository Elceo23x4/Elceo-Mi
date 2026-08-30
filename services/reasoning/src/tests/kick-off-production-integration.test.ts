import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { CanonicalKickOffContextMaterializationService, FencedMaterializationRepository, RedisAdaptiveOwnershipStore, SqlImmutableMaterializationStore, buildKickOffContextCoordinationHash, buildMaterializationScopeHash, createAdaptiveMaterializationRedisClient, createProductionCanonicalKickOffContextReader } from '../adaptive-materialization/index.js';
import { fixture } from './kick-off-dashboard-contract.test.js';

export async function runKickOffProductionIntegrationTests(){
 if(process.env.KICK_OFF_PRODUCTION_INTEGRATION!=='1')return;
 if(!process.env.DATABASE_URL||!process.env.REDIS_URL)throw new Error('kick_off_production_integration_requires_DATABASE_URL_and_REDIS_URL');
 const namespace=`elceo:kick-off:integration:${process.pid}:${Date.now()}`,pool=new Pool({connectionString:process.env.DATABASE_URL}),redis=createAdaptiveMaterializationRedisClient(),ownership=new RedisAdaptiveOwnershipStore(redis,namespace),immutable=new SqlImmutableMaterializationStore(pool),repository=new FencedMaterializationRepository(ownership,immutable);
 try{
  for(const migration of ['0050_adaptive_materialization.sql','0051_dashboard_projection_materialization.sql','0053_kick_off_dashboard_context_materialization.sql'])await pool.query(await readFile(`../../infra/db/schema/${migration}`,'utf8'));
  const base=fixture();await immutable.saveImmutable(base.evidence);await immutable.saveImmutable(base.cognition);await immutable.saveImmutable(base.dashboard);
  assert.ok(await repository.getByIdentity(base.evidence.identity));assert.ok(await repository.getByIdentity(base.cognition.identity));assert.ok(await repository.getByIdentity(base.dashboard.identity));
  const context=await new CanonicalKickOffContextMaterializationService(repository,ownership).materialize({asset:'XAU/USD',dashboardArtifactIdentity:base.dashboard.identity,cognitionArtifactIdentity:base.cognition.identity,aggregate:base.aggregate,leaseDurationMs:500,retryMaximumMs:5000}),persisted=await immutable.getImmutable(context.identity);
  assert.ok(persisted&&persisted.kind==='kick_off_dashboard_context');assert.equal(persisted.identity,context.identity);assert.equal(persisted.integrityHash,context.integrityHash);assert.equal((persisted.payload as typeof context.payload).evidence_score.value,base.aggregate.weightedSnapshot.usableWeight);assert.equal(persisted.parentDashboardProjectionIdentity,base.dashboard.identity);assert.equal(persisted.parentCognitionArtifactIdentity,base.cognition.identity);assert.deepEqual(persisted.parentEvidenceArtifactIdentities,[base.evidence.identity]);
  const coordination=buildKickOffContextCoordinationHash({asset:'XAU/USD',horizon:'intraday',timeframe:'H4'}),scope=buildMaterializationScopeHash({asset:'XAU/USD',horizon:'intraday',timeframe:'H4',kind:'kick_off_dashboard_context'});assert.equal(await ownership.readCurrentIdentity(coordination,scope),context.identity);
  const freshRedis=createAdaptiveMaterializationRedisClient(),reader=createProductionCanonicalKickOffContextReader({redisClient:freshRedis,sqlPool:new Pool({connectionString:process.env.DATABASE_URL}),namespace,cacheLimits:{maxEntries:4,maxSerializedBytes:1_000_000}}),read=await reader.read('XAU/USD','intraday','H4');assert.equal(read.state,'available');assert.equal(read.artifact?.identity,context.identity);assert.equal(read.artifact?.kind,'kick_off_dashboard_context');assert.equal(read.artifact?.payload.evidence_score.value,base.aggregate.weightedSnapshot.usableWeight);await freshRedis.quit();
  console.log(`Kick Off A1 integration passed identity=${context.identity}`);
 }finally{if(redis.isOpen){const keys=await redis.keys(`${namespace}:*`);if(keys.length)await redis.del(keys)}await ownership.close();await pool.end()}
}
