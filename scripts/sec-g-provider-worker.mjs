import { appendFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require=createRequire(import.meta.url);
const root=new URL('../services/reasoning/dist-test-cjs/services/reasoning/src/',import.meta.url);
const {executeProviderApiGateRequest}=require(fileURLToPath(new URL('provider-sources/provider-api-gate.cjs',root)));
const cache=require(fileURLToPath(new URL('provider-sources/provider-cache/index.cjs',root)));
const control=require(fileURLToPath(new URL('provider-sources/provider-control/index.cjs',root)));
const resilience=require(fileURLToPath(new URL('provider-sources/provider-resilience/index.cjs',root)));
const {TiingoMarketDataAdapter}=require(fileURLToPath(new URL('provider-sources/tiingo/tiingo-adapter.cjs',root)));
const {buildTestProviderCachePolicy}=require(fileURLToPath(new URL('tests/provider-cache.test.cjs',root)));
const {buildTestProviderControlPolicy}=require(fileURLToPath(new URL('tests/provider-control.test.cjs',root)));
const {buildTestProviderResiliencePolicy}=require(fileURLToPath(new URL('tests/provider-resilience.test.cjs',root)));

if(!process.env.REDIS_URL)throw new Error('REDIS_URL_required');
if(!process.env.SEC_G_PROVIDER_NAMESPACE)throw new Error('SEC_G_PROVIDER_NAMESPACE_required');
const namespace=process.env.SEC_G_PROVIDER_NAMESPACE,worker=process.env.SEC_G_PROVIDER_WORKER??String(process.pid),region=process.env.SEC_G_PROVIDER_REGION??'sec-g-multiprocess',counterPath=process.env.SEC_G_PROVIDER_COUNTER_PATH;
const barrier=process.env.SEC_G_PROVIDER_BARRIER;
process.stdout.write(`${JSON.stringify({event:'ready',worker,pid:process.pid})}\n`);
if(barrier){const started=Date.now();while(!existsSync(barrier)){if(Date.now()-started>10000)throw new Error('sec_g_provider_barrier_timeout');await new Promise(resolve=>setTimeout(resolve,10));}}

const cacheClient=cache.createProviderCacheRedisClient({url:process.env.REDIS_URL});
const controlClient=control.createProviderControlRedisClient({url:process.env.REDIS_URL});
const resilienceClient=resilience.createProviderResilienceRedisClient({url:process.env.REDIS_URL});
const cacheStore=new cache.RedisProviderCacheStore(cacheClient,`${namespace}:cache`);
const controlStore=new control.RedisProviderControlStore(controlClient,`${namespace}:control`);
const resilienceStore=new resilience.RedisProviderResilienceStore(resilienceClient,`${namespace}:resilience`);
const cachePolicy=buildTestProviderCachePolicy({policyVersion:'sec-g-multiprocess',freshTtlMs:5000,staleIfErrorTtlMs:1000,flightLeaseMs:1200,followerWaitTimeoutMs:5000,completionTtlMs:1000,maxEntryBytes:1048576});
const controlPolicy=buildTestProviderControlPolicy({policyVersion:'sec-g-multiprocess',rate:{capacity:50,refillAmount:50,refillIntervalMs:60000,requestTokens:1},quota:{kind:'fixed_duration',limit:50,windowMs:60000},cost:{kind:'fixed_duration',budgetUnits:50,windowMs:60000,requestCostUnits:1},concurrency:{maxConcurrent:10,leaseDurationMs:1200,providerTimeoutMs:500}});
const resiliencePolicy=buildTestProviderResiliencePolicy({policyVersion:'sec-g-multiprocess'});
const fixture=new TiingoMarketDataAdapter({mode:'fixture'});
const adapter={descriptor:fixture.descriptor,fetch:async()=>{throw new Error('unmanaged_fetch_forbidden');},fetchManaged:async request=>{if(counterPath)appendFileSync(counterPath,`${JSON.stringify({worker,pid:process.pid,at:new Date().toISOString()})}\n`);await new Promise(resolve=>setTimeout(resolve,150));return fixture.fetch(request);},normalize:async()=>[]};
const request={requestId:`sec-g-${worker}`,sourceId:'tiingo_market_data',capabilityId:'market_price_history',asset:'eur_usd',region,activationMode:'staging_live_allowed',provenance:{actor:'sec-g-empirical',purpose:'multiprocess-single-flight'},policy:{explicitStagingLiveAllow:true,requestMetadata:{credentialPresent:true}}};
try{
 const result=await executeProviderApiGateRequest(request,adapter,{credentialPoolId:'primary',cacheCoordinator:new cache.ProviderCacheCoordinator(cacheStore),cachePolicyResolver:{resolve:async()=>cachePolicy},providerControlStore:controlStore,policyResolver:{resolve:async()=>controlPolicy},resilienceStore,resiliencePolicyResolver:{resolve:async()=>resiliencePolicy}});
 process.stdout.write(`${JSON.stringify({event:'result',worker,pid:process.pid,role:result.cacheSnapshot?.singleFlightRole??null,providerCallMode:result.decision.providerCallMode,decisionReason:result.decision.reason,settlementState:result.settlementState,responseStatus:result.response?.payloadSchemaStatus??null,providerControlSnapshot:result.providerControlSnapshot??null})}\n`);
}catch(error){process.stdout.write(`${JSON.stringify({event:'error',worker,pid:process.pid,error:error instanceof Error?error.message:String(error)})}\n`);process.exitCode=2;}
finally{await Promise.allSettled([cacheStore.close(),controlStore.close(),resilienceStore.close()]);}
