import type { NormalizedMarketEvidencePayload, ProviderSourceRequest, ProviderSourceResponse } from '@elceo/types';
import type { MarketEvidenceProviderAdapter, ProviderManagedExecution } from '../normalization-contracts';
import { buildMetadataJson, buildNormalizedPayloadId, buildValuesJson } from '../normalization-helpers';
import { getProviderDescriptor } from '../provider-capability-registry';

export type IsmPmiAdapterMode='fixture'|'live_disabled'|'live_enabled';
export type IsmPmiAdapterConfig={mode?:IsmPmiAdapterMode;fetchImpl?:typeof fetch;timeoutMs?:number|null};
type IsmKind='manufacturing'|'services';
type ResolvedConfig={mode:IsmPmiAdapterMode;fetchImpl:typeof fetch;timeoutMs:number};
type ParsedIsm={period:string;value:number;previous:number|null;kind:IsmKind};

const FIXTURE:Record<IsmKind,string>={
 manufacturing:'<html><h1>Manufacturing PMI® at 54.6%</h1><h2>August 2026 ISM® Manufacturing PMI® Report</h2><p>The Manufacturing PMI® registered 54.6 percent in August, 1 percentage point below the July figure of 55.6 percent.</p></html>',
 services:'<html><h1>Services PMI® at 55.4%</h1><h2>August 2026 ISM® Services PMI® Report</h2><p>The Services PMI® registered 55.4 percent, an increase of 1.3 percentage points compared to July’s figure of 54.1 percent.</p></html>'
};

class IsmPmiAdapter implements MarketEvidenceProviderAdapter{
 readonly descriptor;
 constructor(private readonly kind:IsmKind,private readonly config:IsmPmiAdapterConfig={}){this.descriptor=getProviderDescriptor(gateId(kind))??(()=>{throw new Error(`missing_ism_descriptor:${gateId(kind)}`)})();}
 async fetch(request:ProviderSourceRequest):Promise<ProviderSourceResponse>{return this.fetchInternal(request);}
 async fetchManaged(request:ProviderSourceRequest,execution:ProviderManagedExecution):Promise<ProviderSourceResponse>{return this.fetchInternal(request,execution);}
 private async fetchInternal(request:ProviderSourceRequest,execution?:ProviderManagedExecution):Promise<ProviderSourceResponse>{
  if(request.providerId!==gateId(this.kind)||request.capability!=='macro_indicator_series')return fail(request,'ism_request_mismatch','ISM request does not match its bounded PMI profile','unsupported');
  const cfg=resolveConfig(this.config);
  if(cfg.mode==='fixture')return{...base(request),status:'success',sourceUrl:`fixture://${gateId(this.kind)}`,rawPayloadJson:FIXTURE[this.kind]};
  if(cfg.mode!=='live_enabled')return fail(request,'ism_live_disabled','ISM live retrieval is disabled');
  const monthSlug=previousMonthSlug(request.requestedAt),section=this.kind==='manufacturing'?'pmi':'services';
  const url=`https://www.ismworld.org/supply-management-news-and-reports/reports/ism-pmi-reports/${section}/${monthSlug}/`;
  const controller=execution?null:new AbortController(),timer=execution?null:setTimeout(()=>controller!.abort(),cfg.timeoutMs),signal=execution?.signal??controller!.signal;
  try{const response=await cfg.fetchImpl(url,{signal,headers:{Accept:'text/html'}});if(!response.ok)return fail(request,response.status===429?'rate_limited':response.status>=500?'provider_5xx':response.status===404?'ism_release_not_published':'ism_request_rejected',`ISM request failed (${response.status})`);const raw=await response.text();if(!raw.trim())return{...base(request),status:'empty',sourceUrl:url,rawPayloadJson:raw};return{...base(request),status:'success',sourceUrl:url,rawPayloadJson:raw};}catch(error){if(error instanceof Error&&error.name==='AbortError')return fail(request,'ism_timeout','ISM request timed out');return fail(request,'ism_fetch_error','ISM request failed');}finally{if(timer)clearTimeout(timer);}
 }
 async normalize(response:ProviderSourceResponse):Promise<NormalizedMarketEvidencePayload[]>{if(!response.rawPayloadJson?.trim())return[];const parsed=parseIsm(response.rawPayloadJson,this.kind),observedAt=`${parsed.period}-01T00:00:00.000Z`;return[{payloadId:buildNormalizedPayloadId('ism_official','macro_indicator_series',observedAt,null)+`:${this.kind}`,evidenceTypeId:'macro_indicator_series',evidenceClass:'growth_activity',providerId:'ism_official',sourceId:'ism_official',region:'united_states',asset:null,observedAt,publishedAt:null,normalizedAt:response.fetchedAt,confidenceScore:99,dataQuality:'high',valuesJson:buildValuesJson({value:parsed.value,previous:parsed.previous,date:parsed.period,indicator:this.kind==='manufacturing'?'ISM Manufacturing PMI':'ISM Services PMI',unit:'index'}),metadataJson:buildMetadataJson({canonicalSourceId:'ism_official',gateSourceId:gateId(this.kind),indicatorFamily:'pmi',sector:this.kind,expansionThreshold:50,sourceUrl:response.sourceUrl,requestId:response.requestId,publisher:'Institute for Supply Management'})}];}
}

export const createIsmManufacturingPmiAdapter=(config:IsmPmiAdapterConfig={})=>new IsmPmiAdapter('manufacturing',config);
export const createIsmServicesPmiAdapter=(config:IsmPmiAdapterConfig={})=>new IsmPmiAdapter('services',config);

function gateId(kind:IsmKind):'ism_manufacturing_pmi'|'ism_services_pmi'{return kind==='manufacturing'?'ism_manufacturing_pmi':'ism_services_pmi';}
function resolveConfig(config:IsmPmiAdapterConfig):ResolvedConfig{return{mode:config.mode??'live_disabled',fetchImpl:config.fetchImpl??fetch,timeoutMs:config.timeoutMs&&Number.isFinite(config.timeoutMs)&&config.timeoutMs>0?config.timeoutMs:10000};}
function base(request:ProviderSourceRequest):ProviderSourceResponse{return{requestId:request.requestId,providerId:request.providerId,capability:request.capability,status:'failed',fetchedAt:request.requestedAt,sourceUrl:null,rawPayloadJson:null,errorCode:null,errorMessage:null};}
function fail(request:ProviderSourceRequest,errorCode:string,errorMessage:string,status:'failed'|'unsupported'='failed'):ProviderSourceResponse{return{...base(request),status,errorCode,errorMessage};}
function previousMonthSlug(value:string):string{const date=new Date(value);if(Number.isNaN(date.getTime()))throw new Error('ism_invalid_requested_at');date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()-1);return['january','february','march','april','may','june','july','august','september','october','november','december'][date.getUTCMonth()]!;}
function parseIsm(raw:string,kind:IsmKind):ParsedIsm{const text=decodeHtml(raw).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();const titleKind=kind==='manufacturing'?'Manufacturing':'Services';const title=new RegExp(`${titleKind}\\s+PMI[^0-9]{0,30}(?:at\\s+)?(\\d{2}(?:\\.\\d+)?)\\s*%?`,'i').exec(text);if(!title)throw new Error(`ism_${kind}_pmi_value_missing`);const report=new RegExp(`(January|February|March|April|May|June|July|August|September|October|November|December)\\s+(20\\d{2})\\s+ISM[^.]{0,50}${titleKind}\\s+PMI`,'i').exec(text);if(!report)throw new Error(`ism_${kind}_report_period_missing`);const month=String(['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(report[1]!.toLowerCase())+1).padStart(2,'0');const value=Number(title[1]);if(!Number.isFinite(value)||value<0||value>100)throw new Error(`ism_${kind}_pmi_invalid`);const previousPattern=kind==='manufacturing'?/below\s+the\s+[A-Za-z]+\s+figure\s+of\s+(\d{2}(?:\.\d+)?)\s+percent|compared\s+to\s+[A-Za-z]+(?:’s|'s)?\s+figure\s+of\s+(\d{2}(?:\.\d+)?)\s+percent/i:/compared\s+to\s+[A-Za-z]+(?:’s|'s)?\s+figure\s+of\s+(\d{2}(?:\.\d+)?)\s+percent|from\s+[A-Za-z]+(?:’s|'s)?\s+reading\s+of\s+(\d{2}(?:\.\d+)?)\s+percent/i;const pm=previousPattern.exec(text),previous=pm?Number(pm[1]??pm[2]):null;return{period:`${report[2]}-${month}`,value,previous:Number.isFinite(previous as number)?previous:null,kind};}
function decodeHtml(value:string):string{return value.replace(/&reg;|&#174;|®/gi,'®').replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/gi,'&').replace(/&rsquo;|&#8217;/gi,'’').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'");}
