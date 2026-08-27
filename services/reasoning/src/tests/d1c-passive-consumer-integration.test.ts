import assert from 'node:assert/strict';
import type { RedisClientType } from 'redis';
import { createProductionCanonicalDashboardProjectionReader, type CanonicalDashboardProjectionReader } from '../adaptive-materialization/index.js';

type Pool={query(sql:string,params?:unknown[]):Promise<{rows:Array<{artifact_json:string;count?:string}>}>};
type Ownership={readCurrentIdentity(coordination:string,scope:string):Promise<string|null>};
type Counters={provider:number;providerGate:number;providerCache:number;ingestion:number;scheduler:number;cognitionCompute:number;cognitionMaterialize:number;projectionCompute:number;projectionMaterialize:number};

const stableKeys=async(client:RedisClientType,namespace:string)=>{
  const keys=(await client.keys(`${namespace}:*`)).sort(),values:Record<string,string>={};
  for(const key of keys)values[key]=await client.type(key)==='string'?(await client.get(key))??'':JSON.stringify(await client.hGetAll(key));
  return{keys,values,lease:keys.filter(k=>k.includes(':lease:')),generation:keys.filter(k=>k.includes(':generation:')),completion:keys.filter(k=>k.includes(':completion:'))};
};

/** Dedicated D1-C acceptance: producer setup is complete before this measurement boundary. */
export async function runD1cPassiveConsumerIntegration(input:{client:RedisClientType;sqlPool:Pool;namespace:string;ownership:Ownership;coordination:string;scope:string;counters:()=>Counters}){
  if(process.env.D1C_PASSIVE_CONSUMER_INTEGRATION!=='1')return;
  const limits={maxEntries:12,maxSerializedBytes:4_000_000},reader:CanonicalDashboardProjectionReader=createProductionCanonicalDashboardProjectionReader({redisClient:input.client,sqlPool:input.sqlPool,cacheLimits:limits,namespace:input.namespace});
  const beforeCounters=input.counters(),beforeRows=Number((await input.sqlPool.query('SELECT count(*)::text AS count FROM app_canonical_materializations')).rows[0]?.count),beforePointer=await input.ownership.readCurrentIdentity(input.coordination,input.scope),beforeRedis=await stableKeys(input.client,input.namespace);
  assert.ok(beforePointer);const reads=await Promise.all(Array.from({length:1000},()=>reader.read('XAU/USD','intraday','H4'))),identities=new Set(reads.map(read=>read.artifact?.identity));
  assert.deepEqual([...identities],[beforePointer]);assert.ok(reads.every(read=>read.state==='available'));
  const afterCounters=input.counters(),afterRows=Number((await input.sqlPool.query('SELECT count(*)::text AS count FROM app_canonical_materializations')).rows[0]?.count),afterPointer=await input.ownership.readCurrentIdentity(input.coordination,input.scope),afterRedis=await stableKeys(input.client,input.namespace);
  assert.deepEqual(afterCounters,beforeCounters,'all producer/provider/ingestion side-effect deltas are zero');assert.equal(afterRows-beforeRows,0);assert.equal(afterPointer,beforePointer);assert.deepEqual(afterRedis,beforeRedis,'GET creates no lease, generation, completion, token, or pointer mutation');
  assert.ok(reader.metrics.cacheEntries<=limits.maxEntries);assert.ok(reader.metrics.cacheBytes<=limits.maxSerializedBytes);assert.equal(reader.metrics.cacheEntries,1,'stable identity has bounded constant L1 occupancy');
  console.log(`D1-C passive production consumer passed: reads=1000 identity=${beforePointer} provider/gate/cache/ingestion/scheduler/cognition/projection_delta=0 rows=0 pointer=0 lease=0 generation=0 completion=0 l1_entries=${reader.metrics.cacheEntries} l1_bytes=${reader.metrics.cacheBytes}`);
}
