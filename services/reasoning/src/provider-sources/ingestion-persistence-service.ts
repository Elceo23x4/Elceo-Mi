import type { MarketEvidenceProviderAdapter } from './normalization-contracts';
import type { NormalizedMarketEvidencePayload, ProviderSourceRequest, ProviderSourceResponse } from '@elceo/types';
import type { NormalizedMarketEvidencePayloadRepository, ProviderSourceRequestRepository, ProviderSourceResponseRepository } from '../persistence/market-evidence-ingestion-repository';
import type { ProviderApiGateExecutionResult } from './provider-api-gate';
export type IngestionPersistenceReport={requestId:string;providerId:string;capability:string;responseStatus:ProviderSourceResponse['status'];payloadCount:number;persistedPayloadIds:string[];errors:string[]};
export class IngestionPersistenceService{constructor(private readonly req:ProviderSourceRequestRepository,private readonly res:ProviderSourceResponseRepository,private readonly pay:NormalizedMarketEvidencePayloadRepository){}
async persistProviderSourceRequest(request:ProviderSourceRequest){await this.req.saveRequest({...request,createdAt:new Date().toISOString()});}
async persistProviderSourceResponse(response:ProviderSourceResponse){await this.res.saveResponse({...response,createdAt:new Date().toISOString()});}
async persistNormalizedMarketEvidencePayload(payload:NormalizedMarketEvidencePayload){await this.pay.savePayload({...payload,createdAt:new Date().toISOString()});}
async persistIngestionResult(request:ProviderSourceRequest,response:ProviderSourceResponse,payloads:NormalizedMarketEvidencePayload[]):Promise<IngestionPersistenceReport>{const errors:string[]=[];const ids:string[]=[]; try{await this.persistProviderSourceRequest(request);}catch(e){errors.push(String(e));} try{await this.persistProviderSourceResponse(response);}catch(e){errors.push(String(e));} for(const p of payloads){try{await this.persistNormalizedMarketEvidencePayload(p); ids.push(p.payloadId);}catch(e){errors.push(String(e));}} return {requestId:request.requestId,providerId:request.providerId,capability:request.capability,responseStatus:response.status,payloadCount:payloads.length,persistedPayloadIds:ids,errors};}
async persistProviderApiGateResult(adapter:MarketEvidenceProviderAdapter,request:ProviderSourceRequest,result:ProviderApiGateExecutionResult){
 if(!result.decision.allowed||!result.response)throw new Error(result.decision.reason);
 if(result.cacheSnapshot?.payloadPersistence==='evaluation_no_store')throw new Error('provider_no_store_persistence_forbidden');
 const runtime=result.response,status:ProviderSourceResponse['status']=runtime.payloadSchemaStatus==='valid'?(runtime.recordCount===0&&runtime.payload===null?'empty':'success'):'failed';
 const response:ProviderSourceResponse={requestId:request.requestId,providerId:request.providerId,capability:request.capability,status,fetchedAt:runtime.receivedAt,sourceUrl:runtime.sourceUrl??null,rawPayloadJson:runtime.payloadSchemaStatus==='valid'?JSON.stringify(runtime.payload):null,errorCode:runtime.error?.category??null,errorMessage:runtime.error?.message??null,...(runtime.rateLimit?.retryAfterMs===undefined?{}:{retryAfterMs:runtime.rateLimit.retryAfterMs})};
 const payloads=runtime.payloadSchemaStatus==='valid'?await adapter.normalize(response):[];
 return this.persistIngestionResult(request,response,payloads);
}
async persistAdapterFetchAndNormalize(adapter:MarketEvidenceProviderAdapter,request:ProviderSourceRequest){const response=await adapter.fetch(request); const payloads=await adapter.normalize(response); return this.persistIngestionResult(request,response,payloads);}}
