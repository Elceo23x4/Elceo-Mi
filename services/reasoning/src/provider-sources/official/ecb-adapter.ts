import type { MarketEvidenceProviderAdapter, ProviderManagedExecution } from '../normalization-contracts';
import type { NormalizedMarketEvidencePayload, ProviderSourceRequest, ProviderSourceResponse } from '@elceo/types';
import { getProviderDescriptor } from '../provider-capability-registry';

const ORIGIN='https://data-api.ecb.europa.eu';
const SERIES:Record<string,string>={deposit_facility:'FM.D.U2.EUR.4F.KR.DFR.LEV',main_refinancing:'FM.D.U2.EUR.4F.KR.MRR_RT.LEV',marginal_lending:'FM.D.U2.EUR.4F.KR.MLFR.LEV'};
export type EcbAdapterConfig={mode?:'fixture'|'live_disabled'|'live_enabled';fetchImpl?:typeof fetch};
export const ECB_CSV_FIXTURE='KEY,FREQ,REF_AREA,CURRENCY,DENOM_CURRENCY,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE\nFM.D.U2.EUR.4F.KR.DFR.LEV,D,U2,EUR,,,,2026-06-17,2.25\n';

export class EcbOfficialAdapter implements MarketEvidenceProviderAdapter{
 readonly descriptor=getProviderDescriptor('ecb_public')??(()=>{throw new Error('missing_ecb_descriptor');})();
 constructor(private readonly config:EcbAdapterConfig={}){}
 fetch(request:ProviderSourceRequest){return this.fetchInternal(request);}
 fetchManaged(request:ProviderSourceRequest,execution:ProviderManagedExecution){return this.fetchInternal(request,execution);}
 private async fetchInternal(request:ProviderSourceRequest,execution?:ProviderManagedExecution):Promise<ProviderSourceResponse>{
  if(request.capability!=='policy_rate_series')return fail(request,'unsupported_capability');
  const params=parseParams(request.paramsJson);if(!params.ok)return fail(request,params.code);
  const mode=this.config.mode??'live_disabled';
  if(mode==='fixture')return success(request,JSON.stringify(parseEcbCsv(ECB_CSV_FIXTURE)),`${ORIGIN}/service/data/FM/${SERIES[params.series]!.slice(3)}?format=csvdata`);
  if(mode!=='live_enabled')return fail(request,'ecb_live_disabled');
  const full=SERIES[params.series]!,key=full.startsWith('FM.')?full.slice(3):full;const url=new URL(`/service/data/FM/${key}`,ORIGIN);url.searchParams.set('format','csvdata');if(params.startPeriod)url.searchParams.set('startPeriod',params.startPeriod);if(params.endPeriod)url.searchParams.set('endPeriod',params.endPeriod);
  const init:RequestInit=execution?{signal:execution.signal,headers:{Accept:'text/csv'}}:{headers:{Accept:'text/csv'}};
  try{const response=await (this.config.fetchImpl??fetch)(url,init);if(!response.ok)return fail(request,response.status===429?'rate_limited':`ecb_http_${response.status}`);const csv=await response.text();const rows=parseEcbCsv(csv);if(!rows.length)return fail(request,'ecb_empty_or_malformed');return success(request,JSON.stringify(rows),url.toString());}catch(error){if(error instanceof Error&&error.name==='AbortError')return fail(request,'ecb_timeout');return fail(request,'ecb_fetch_error');}
 }
 async normalize(response:ProviderSourceResponse):Promise<NormalizedMarketEvidencePayload[]>{if(!response.rawPayloadJson)return[];const rows=JSON.parse(response.rawPayloadJson) as Array<Record<string,string>>;return rows.filter(row=>Number.isFinite(Number(row.OBS_VALUE))).map((row,index)=>({payloadId:`${response.requestId}:${index}`,evidenceTypeId:response.capability,evidenceClass:'central_bank_policy',providerId:'ecb_official',sourceId:'ecb_official',region:'euro_area',asset:null,observedAt:toIso(row.TIME_PERIOD),publishedAt:null,normalizedAt:response.fetchedAt,confidenceScore:98,dataQuality:'high',valuesJson:JSON.stringify({seriesKey:row.KEY,timePeriod:row.TIME_PERIOD,value:Number(row.OBS_VALUE),currency:row.CURRENCY}),metadataJson:JSON.stringify({canonicalSourceId:'ecb_official',gateSourceId:'ecb_public',requestId:response.requestId,sourceUrl:response.sourceUrl})}));}
}
export function parseEcbCsv(csv:string):Array<Record<string,string>>{const lines=csv.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);if(lines.length<2)return[];const header=parseCsvLine(lines[0]!);return lines.slice(1).map(line=>{const values=parseCsvLine(line),row:Record<string,string>={};header.forEach((key,i)=>row[key]=values[i]??'');return row;}).filter(row=>Boolean(row.TIME_PERIOD)&&Boolean(row.OBS_VALUE));}
function parseCsvLine(line:string){const out:string[]=[],re=/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g;let match:RegExpExecArray|null;while((match=re.exec(line)))out.push((match[1]??'').replace(/^"|"$/g,'').replace(/""/g,'"'));return out;}
function parseParams(raw:string):{ok:true;series:string;startPeriod:string|null;endPeriod:string|null}|{ok:false;code:string}{let value:unknown;try{value=JSON.parse(raw||'{}');}catch{return{ok:false,code:'invalid_params'};}if(!value||typeof value!=='object'||Array.isArray(value))return{ok:false,code:'invalid_params'};const p=value as Record<string,unknown>;if(Object.keys(p).some(k=>!['series','startPeriod','endPeriod'].includes(k)))return{ok:false,code:'unsupported_param'};if(typeof p.series!=='string'||!(p.series in SERIES))return{ok:false,code:'unsupported_series'};for(const k of ['startPeriod','endPeriod'] as const){const v=p[k];if(v!==undefined&&v!==null&&(typeof v!=='string'||!/^[0-9]{4}(?:-[0-9]{2}(?:-[0-9]{2})?)?$/.test(v)))return{ok:false,code:'invalid_period'};}return{ok:true,series:p.series,startPeriod:(p.startPeriod as string|undefined)??null,endPeriod:(p.endPeriod as string|undefined)??null};}
function toIso(value:string|undefined){if(!value)return new Date(0).toISOString();const expanded=/^\d{4}-\d{2}-\d{2}$/.test(value)?`${value}T00:00:00Z`:/^\d{4}-\d{2}$/.test(value)?`${value}-01T00:00:00Z`:`${value}-01-01T00:00:00Z`;const parsed=Date.parse(expanded);return Number.isFinite(parsed)?new Date(parsed).toISOString():new Date(0).toISOString();}
function base(r:ProviderSourceRequest):ProviderSourceResponse{return{requestId:r.requestId,providerId:r.providerId,capability:r.capability,status:'failed',fetchedAt:new Date().toISOString(),sourceUrl:null,rawPayloadJson:null,errorCode:null,errorMessage:null};}
function fail(r:ProviderSourceRequest,code:string):ProviderSourceResponse{return{...base(r),errorCode:code,errorMessage:code};}
function success(r:ProviderSourceRequest,payload:string,url:string):ProviderSourceResponse{return{...base(r),status:'success',rawPayloadJson:payload,sourceUrl:url};}
