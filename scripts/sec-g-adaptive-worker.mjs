import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require=createRequire(import.meta.url);
const adaptive=require(fileURLToPath(new URL('../services/reasoning/dist-test-cjs/services/reasoning/src/adaptive-materialization/index.cjs',import.meta.url)));
const redisUrl=process.env.REDIS_URL;if(!redisUrl)throw new Error('REDIS_URL_required');
const jobHash=process.env.SEC_G_ADAPTIVE_JOB_HASH;if(!jobHash)throw new Error('SEC_G_ADAPTIVE_JOB_HASH_required');
const scope=process.env.SEC_G_ADAPTIVE_SCOPE;if(!scope)throw new Error('SEC_G_ADAPTIVE_SCOPE_required');
const token=process.env.SEC_G_ADAPTIVE_TOKEN;if(!token)throw new Error('SEC_G_ADAPTIVE_TOKEN_required');
const identity=process.env.SEC_G_ADAPTIVE_IDENTITY??`artifact-${token}`;
const leaseMs=Number(process.env.SEC_G_ADAPTIVE_LEASE_MS??'300');
const holdMs=Number(process.env.SEC_G_ADAPTIVE_HOLD_MS??'10000');
const namespace=process.env.SEC_G_ADAPTIVE_NAMESPACE??'elceo:sec-g:adaptive:v1';
const client=adaptive.createAdaptiveMaterializationRedisClient(redisUrl);
const store=new adaptive.RedisAdaptiveOwnershipStore(client,namespace);
const result=await store.acquireMaterialization(jobHash,scope,token,leaseMs);
if(!result.acquired){process.stdout.write(`${JSON.stringify({event:'not-acquired',reason:result.reason})}\n`);await store.close();process.exit(2);}
const published=await store.publishCurrent(result.lease,scope,identity);
process.stdout.write(`${JSON.stringify({event:'claimed',lease:result.lease,published,identity})}\n`);
const timer=setTimeout(async()=>{await store.close();process.exit(0);},holdMs);timer.unref();
process.on('SIGTERM',async()=>{clearTimeout(timer);await store.close().catch(()=>{});process.exit(0);});
await new Promise(()=>{});
