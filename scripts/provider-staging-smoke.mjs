import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { evaluateProviderStagingSmokePreflight } from './provider-evaluation-preflight.mjs';

function refuse(condition, reason) { if (condition) { console.error(`provider evaluation smoke refused:${reason}`); process.exit(2); } }

const preflight=evaluateProviderStagingSmokePreflight(process.env);
if (!preflight.ok) { console.error(`provider evaluation smoke refused:${preflight.reason}`); process.exit(2); }
const {provider,capability,asset,frequency}=preflight;
const require=createRequire(import.meta.url);
const root=new URL('../services/reasoning/dist-test-cjs/services/reasoning/src/provider-sources/',import.meta.url);
const modules=['provider-api-gate.cjs','provider-evaluation-certification.cjs','provider-cache/index.cjs','provider-control/index.cjs','provider-resilience/index.cjs','tiingo/tiingo-adapter.cjs'];
for(const module of modules) refuse(!existsSync(new URL(module,root)),'reasoning_cjs_build_missing');
const {executeProviderApiGateRequest}=require(fileURLToPath(new URL(modules[0],root)));
const evaluation=require(fileURLToPath(new URL(modules[1],root)));
const cache=require(fileURLToPath(new URL(modules[2],root)));
const control=require(fileURLToPath(new URL(modules[3],root)));
const resilience=require(fileURLToPath(new URL(modules[4],root)));
const {TiingoMarketDataAdapter}=require(fileURLToPath(new URL(modules[5],root)));
const {validateNormalizedMarketEvidencePayload}=require('@elceo/schemas');
const profile=evaluation.resolveProviderEvaluationProfile(provider,capability,asset);
refuse(!profile,'profile_not_allowlisted');

const namespace=`elceo:provider-evaluation:p1b-v1:${profile.profileId}`;
const cacheClient=cache.createProviderCacheRedisClient({url:process.env.REDIS_URL});
const controlClient=control.createProviderControlRedisClient({url:process.env.REDIS_URL});
const resilienceClient=resilience.createProviderResilienceRedisClient({url:process.env.REDIS_URL});
const cacheStore=new cache.RedisProviderCacheStore(cacheClient,`${namespace}:cache`);
const controlStore=new control.RedisProviderControlStore(controlClient,`${namespace}:control`);
const resilienceStore=new resilience.RedisProviderResilienceStore(resilienceClient,`${namespace}:resilience`);
try {
 const adapter=new TiingoMarketDataAdapter({mode:'live_enabled',liveEnabled:true,apiKey:process.env.TIINGO_API_KEY,timeoutMs:5000});
 const requestId=`p1b-${Date.now()}`;
 const request={requestId,sourceId:provider,capabilityId:capability,asset,region:'global',activationMode:'staging_live_allowed',providerRequestParams:{startDate:'2026-09-01',endDate:'2026-09-02',frequency},provenance:{actor:'provider_evaluation_operator',purpose:'prov_p1b_no_store_certification'},policy:{explicitStagingLiveAllow:true,requestMetadata:{credentialPresent:true},allowedNullableFields:['volume'],allowUnknownFields:true}};
 const result=await executeProviderApiGateRequest(request,adapter,{credentialPoolId:profile.credentialPoolId,cacheCoordinator:new cache.ProviderCacheCoordinator(cacheStore),cachePolicyResolver:evaluation.evaluationCachePolicyResolver,providerControlStore:controlStore,policyResolver:evaluation.evaluationProviderControlPolicyResolver,resilienceStore,resiliencePolicyResolver:evaluation.evaluationResiliencePolicyResolver});
 if(!result.response||result.response.payloadSchemaStatus!=='valid') throw new Error(`certification_failed:${result.decision.reason}`);
 let sourceResponse={requestId,providerId:provider,capability,status:'success',fetchedAt:result.response.receivedAt,sourceUrl:null,rawPayloadJson:JSON.stringify(result.response.payload),errorCode:null,errorMessage:null};
 let normalized=await adapter.normalize(sourceResponse);
 const normalizedSchemaValidated=normalized.every((payload)=>validateNormalizedMarketEvidencePayload(payload).ok);
 if(!normalizedSchemaValidated) throw new Error('normalized_schema_invalid');
 const recordCount=normalized.length; normalized=[]; sourceResponse=null;
 console.log(JSON.stringify({status:'evaluation_certified',provider,capability,asset,requestId,providerCallMode:result.decision.providerCallMode,settlementState:result.settlementState,rawSchemaValidated:true,normalizedSchemaValidated,recordCount,payloadPersistence:result.cacheSnapshot?.payloadPersistence,singleFlightRole:result.cacheSnapshot?.singleFlightRole,redactionProof:true,redisNoStoreProof:result.cacheSnapshot?.singleFlightOutcome==='success_no_store',productionBlocked:true}));
} finally { await Promise.allSettled([cacheStore.close(),controlStore.close(),resilienceStore.close()]); }
