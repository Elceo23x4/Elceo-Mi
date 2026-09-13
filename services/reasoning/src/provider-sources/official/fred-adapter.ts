import type { MarketEvidenceProviderAdapter, ProviderManagedExecution } from '../normalization-contracts';
import type { NormalizedMarketEvidencePayload, ProviderSourceRequest, ProviderSourceResponse } from '@elceo/types';
import { getProviderDescriptor } from '../provider-capability-registry';

const ORIGIN='https://api.stlouisfed.org';
const ALLOWED_SERIES=new Set(['DFII10','DGS10','NFCI']);
const ALLOWED_CAPABILITIES=new Set(['real_yield_series','financial_conditions_index']);
export type FredAdapterConfig={mode?:'fixture'|'live_disabled'|'live_enabled';apiKey?:string|null;fetchImpl?:typeof fetch};
export const FRED_FIXTURE={realtime_start:'2026-06-17',realtime_end:'2026-06-17',observation_start:'2026-06-17',observation_end:'2026-06-17',units:'lin',output_type:1,file_type:'json',order_by:'observation_date',sort_order:'asc',count:1,offset:0,limit:100000,observations:[{realtime_start:'2026-06-17',realtime_end:'2026-06-17',date:'2026-06-17',value:'1.95'}]};

export class FredOfficialAdapter implements MarketEvidenceProviderAdapter{
 readonly descriptor=getProviderDescriptor('fred')??(()=>{throw new Error('missing_fred_descriptor');})();
 constructor(private readonly config:FredAdapterConfig={}){}
 fetch(request:ProviderSourceRequest){return this.fetchInternal(request);}
 fetchManaged(request:ProviderSourceRequest,execution:ProviderManagedExecution){return this.fetchInternal(request,execution);}
 private async fetchInternal(request:ProviderSourceRequest,execution?:ProviderManagedExecution):Promise<ProviderSourceResponse>{
  if(!ALLOWED_CAPABILITIES.has(request.capability))return fail(request,'unsupported_capability');
  const params=parseParams(request.paramsJson);if(!params.ok)return fail(request,params.code);
  const mode=this.config.mode??'live_disabled';
  if(mode==='fixture')return success(request,JSON.stringify(FRED_FIXTURE),`${ORIGIN}/fred/series/observations`);
  if(mode!=='live_enabled')return fail(request,'fred_live_disabled');
  if(!this.config.apiKey)return fail(request,'missing_api_key');
  const url=new URL('/fred/series/observations',ORIGIN);url.searchParams.set('series_id',params.seriesId);url.searchParams.set('api_key',this.config.apiKey);url.searchParams.set('file_type','json');
  if(params.observationStart)url.searchParams.set('observation_start',params.observationStart);if(params.observationEnd)url.searchParams.set('observation_end',params.observationEnd);
  try{const response=await (this.config.fetchImpl??fetch)(url,{signal:execution?.signal});if(!response.ok)return fail(request,response.status===429?'rate_limited':`fred_http_${response.status}`);const payload=await response.json() as unknown;assertFredPayload(payload);return success(request,JSON.stringify(payload),sanitize(url));}catch(error){if(error instanceof Error&&error.name==='AbortError')return fail(request,'fred_timeout');return fail(request,'fred_fetch_error');}
 }
 async normalize(response:ProviderSourceResponse):Promise<NormalizedMarketEvidencePayload[]>{if(!response.rawPayloadJson)return[];const payload=JSON.parse(response.rawPayloadJson) as unknown;assertFredPayload(payload);return payload.observations.filter(x=>x.value!=='.'&&Number.isFinite(Number(x.value))).map((x,index)=>({payloadId:`${response.requestId}:${index}`,evidenceTypeId:response.capability,evidenceClass:response.capability==='financial_conditions_index'?'financial_conditions':'real_yields',providerId:'fred_macro',sourceId:'fred_macro',region:'united_states',asset:null,observedAt:`${x.date}T00:00:00.000Z`,publishedAt:null,normalizedAt:response.fetchedAt,confidenceScore:90,dataQuality:'high',valuesJson:JSON.stringify({value:Number(x.value),date:x.date,realtimeStart:x.realtime_start,realtimeEnd:x.realtime_end}),metadataJson:JSON.stringify({canonicalSourceId:'fred_macro',gateSourceId:'fred',requestId:response.requestId,sourceUrl:response.sourceUrl})}));}
}
function parseParams(raw:string):{ok:true;seriesId:string;observationStart:string|null;observationEnd:string|null}|{ok:false;code:string}{let value:unknown;try{value=JSON.parse(raw||'{}');}catch{return{ok:false,code:'invalid_params'};}if(!value||typeof value!=='object'||Array.isArray(value))return{ok:false,code:'invalid_params'};const p=value as Record<string,unknown>;if(Object.keys(p).some(k=>!['seriesId','observationStart','observationEnd'].includes(k)))return{ok:false,code:'unsupported_param'};if(typeof p.seriesId!=='string'||!ALLOWED_SERIES.has(p.seriesId))return{ok:false,code:'unsupported_series'};for(const key of ['observationStart','observationEnd'] as const){const v=p[key];if(v!==undefined&&v!==null&&(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)))return{ok:false,code:'invalid_date'};}return{ok:true,seriesId:p.seriesId,observationStart:(p.observationStart as string|undefined)??null,observationEnd:(p.observationEnd as string|undefined)??null};}
function assertFredPayload(value:unknown):asserts value is {observations:Array<{date:string;value:string;realtime_start:string;realtime_end:string}>}{if(!value||typeof value!=='object'||!Array.isArray((value as {observations?:unknown}).observations))throw new Error('fred_malformed_payload');for(const row of (value as {observations:unknown[]}).observations){if(!row||typeof row!=='object'||typeof (row as any).date!=='string'||typeof (row as any).value!=='string'||typeof (row as any).realtime_start!=='string'||typeof (row as any).realtime_end!=='string')throw new Error('fred_malformed_observation');}}
function base(r:ProviderSourceRequest):ProviderSourceResponse{return{requestId:r.requestId,providerId:r.providerId,capability:r.capability,status:'failed',fetchedAt:new Date().toISOString(),sourceUrl:null,rawPayloadJson:null,errorCode:null,errorMessage:null};}
function fail(r:ProviderSourceRequest,code:string):ProviderSourceResponse{return{...base(r),errorCode:code,errorMessage:code};}
function success(r:ProviderSourceRequest,payload:string,url:string):ProviderSourceResponse{return{...base(r),status:'success',rawPayloadJson:payload,sourceUrl:url};}
function sanitize(url:URL){const clean=new URL(url);clean.searchParams.delete('api_key');return clean.toString();}
