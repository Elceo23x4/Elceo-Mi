import type { ProviderSourceRequest, ProviderSourceResponse } from '@elceo/types';
import type { MarketEvidenceProviderAdapter, ProviderManagedExecution } from '../normalization-contracts';
import { getProviderDescriptor } from '../provider-capability-registry';
import { COT_FIXTURES } from './fixtures';
import type { CotFixtureRequest, CotFixtureResponse, CotReportRow } from './cot-contracts';
import { COT_PROVIDER_ID, mapAssetToCotMarket, normalizeCotRows } from './cot-normalizer';

const SUPPORTED = new Set(['cot_report']);
const CFTC_ORIGIN='https://publicreporting.cftc.gov';
const CFTC_DATASET='6dca-aqww';
const CFTC_PATH=`/api/v3/views/${CFTC_DATASET}/query.json`;
const CFTC_CODES:Readonly<Record<string,string>>={
 xau_usd:'088691',
 eur_usd:'099741',
 gbp_usd:'096742',
 usd_jpy:'097741',
 usd_chf:'092741',
 aud_usd:'232741',
 nzd_usd:'112741',
 usd_cad:'090741',
 btc_usd:'133741',
 nasdaq_100:'209742',
 sp500:'13874+',
 dxy:'098662'
};
const SELECT_FIELDS=[
 'market_and_exchange_names','report_date_as_yyyy_mm_dd','cftc_contract_market_code','open_interest_all',
 'noncomm_positions_long_all','noncomm_positions_short_all','noncomm_postions_spread_all',
 'comm_positions_long_all','comm_positions_short_all','nonrept_positions_long_all','nonrept_positions_short_all'
] as const;

export type CftcCotAdapterMode='fixture'|'live_disabled'|'live_enabled';
export type CftcCotRuntimeConfig={mode?:CftcCotAdapterMode;liveEnabled?:boolean;appToken?:string|null;timeoutMs?:number|null;fetchImpl?:typeof fetch};
type ResolvedConfig={mode:CftcCotAdapterMode;liveEnabled:boolean;appToken:string|null;timeoutMs:number;fetchImpl:typeof fetch};
type RecordValue=Record<string,unknown>;

function resolveConfig(config:CftcCotRuntimeConfig):ResolvedConfig{const liveEnabled=config.liveEnabled??false;return{mode:config.mode??(liveEnabled?'live_enabled':'live_disabled'),liveEnabled,appToken:config.appToken?.trim()||null,timeoutMs:config.timeoutMs&&Number.isFinite(config.timeoutMs)&&config.timeoutMs>0?config.timeoutMs:10000,fetchImpl:config.fetchImpl??fetch};}

export class CftcCotAdapter implements MarketEvidenceProviderAdapter {
 descriptor = getProviderDescriptor(COT_PROVIDER_ID) ?? (()=>{throw new Error('missing_cot_descriptor')})();
 constructor(private readonly config:CftcCotRuntimeConfig={mode:'fixture'}){}
 async fetch(request:ProviderSourceRequest):Promise<ProviderSourceResponse>{return this.fetchInternal(request);}
 async fetchManaged(request:ProviderSourceRequest,execution:ProviderManagedExecution):Promise<ProviderSourceResponse>{return this.fetchInternal(request,execution);}
 private async fetchInternal(request:ProviderSourceRequest,execution?:ProviderManagedExecution):Promise<ProviderSourceResponse>{
  if(!SUPPORTED.has(request.capability))return fail(request,'unsupported_capability',`Unsupported capability: ${request.capability}`,'unsupported');
  if(!request.asset)return fail(request,'missing_asset','Asset is required for CFTC COT fetch');
  const cfg=resolveConfig(this.config);
  if(cfg.mode==='fixture'){
   const fixture=COT_FIXTURES[request.asset];
   const payload=fixture??{request:{asset:request.asset,reportKind:'legacy_futures_only',requestedAt:request.requestedAt,region:request.region},rows:[]};
   return{...base(request),status:'success',rawPayloadJson:JSON.stringify(payload),sourceUrl:`fixture://cftc/${mapAssetToCotMarket(request.asset)}`};
  }
  if(cfg.mode==='live_disabled'||!cfg.liveEnabled)return fail(request,'cftc_live_disabled','Live CFTC COT fetch is disabled');
  const code=CFTC_CODES[request.asset];
  if(!code)return fail(request,'cftc_unsupported_asset',`No canonical CFTC contract mapping for ${request.asset}`,'unsupported');
  return fetchLive(request,code,cfg,execution);
 }
 async normalize(response:ProviderSourceResponse){if(!response.rawPayloadJson||response.rawPayloadJson.trim()==='')return[];const parsed=JSON.parse(response.rawPayloadJson) as CotFixtureResponse;if(!parsed||!parsed.request||!Array.isArray(parsed.rows))throw new Error('cot_malformed_payload');return normalizeCotRows(parsed.request,parsed.rows,response.providerId);}
}

async function fetchLive(request:ProviderSourceRequest,code:string,cfg:ResolvedConfig,managed?:ProviderManagedExecution):Promise<ProviderSourceResponse>{
 const url=`${CFTC_ORIGIN}${CFTC_PATH}`;
 const query=`SELECT ${SELECT_FIELDS.map(x=>`\`${x}\``).join(',')} WHERE \`cftc_contract_market_code\`='${code.replace(/'/g,"''")}' ORDER BY \`report_date_as_yyyy_mm_dd\` DESC LIMIT 1`;
 const controller=managed?null:new AbortController(),timer=managed?null:setTimeout(()=>controller!.abort(),cfg.timeoutMs),signal=managed?.signal??controller!.signal;
 try{
  const headers:Record<string,string>={'Content-Type':'application/json','Accept':'application/json'};
  if(cfg.appToken)headers['X-App-Token']=cfg.appToken;
  const response=await cfg.fetchImpl(url,{method:'POST',signal,headers,body:JSON.stringify({query,page:{pageNumber:1,pageSize:1},includeSynthetic:false})});
  if(!response.ok)return fail(request,response.status===429?'rate_limited':response.status>=500?'provider_5xx':'cftc_request_rejected',`CFTC request failed (${response.status})`);
  const json=await response.json() as unknown;
  const records=extractRecords(json);
  if(records.length===0)return{...base(request),status:'empty',sourceUrl:url,rawPayloadJson:JSON.stringify({request:cotRequest(request),rows:[]})};
  const row=parseRecord(records[0]!,request.asset!,code);
  return{...base(request),status:'success',sourceUrl:url,rawPayloadJson:JSON.stringify({request:cotRequest(request),rows:[row]})};
 }catch(error){if(error instanceof Error&&error.name==='AbortError')return fail(request,'cftc_timeout','CFTC request timed out');return fail(request,'cftc_fetch_error','CFTC request failed');}finally{if(timer)clearTimeout(timer);}
}

function cotRequest(request:ProviderSourceRequest):CotFixtureRequest{return{asset:request.asset,reportKind:'legacy_futures_only',requestedAt:request.requestedAt,region:request.region};}
function extractRecords(value:unknown):RecordValue[]{if(Array.isArray(value))return value.filter(isRecord);if(isRecord(value)){const candidates=[value.data,value.results,value.resultSet,value.RESULTSET];for(const candidate of candidates)if(Array.isArray(candidate))return candidate.filter(isRecord);}throw new Error('cftc_malformed_live_payload');}
function parseRecord(row:RecordValue,asset:string,expectedCode:string):CotReportRow{
 const code=requiredString(row.cftc_contract_market_code,'cftc_contract_market_code');if(code!==expectedCode)throw new Error('cftc_contract_code_mismatch');
 const reportDate=requiredString(row.report_date_as_yyyy_mm_dd,'report_date_as_yyyy_mm_dd');if(Number.isNaN(Date.parse(reportDate)))throw new Error('cftc_invalid_report_date');
 return{reportDate,marketName:requiredString(row.market_and_exchange_names,'market_and_exchange_names'),cftcMarketCode:code,exchangeName:null,asset,openInterest:requiredNumber(row.open_interest_all,'open_interest_all'),commercialLong:nullableNumber(row.comm_positions_long_all),commercialShort:nullableNumber(row.comm_positions_short_all),nonCommercialLong:nullableNumber(row.noncomm_positions_long_all),nonCommercialShort:nullableNumber(row.noncomm_positions_short_all),nonCommercialSpreading:nullableNumber(row.noncomm_postions_spread_all),dealerLong:null,dealerShort:null,assetManagerLong:null,assetManagerShort:null,leveragedFundsLong:null,leveragedFundsShort:null,otherReportablesLong:nullableNumber(row.nonrept_positions_long_all),otherReportablesShort:nullableNumber(row.nonrept_positions_short_all)};
}
function requiredString(value:unknown,name:string):string{if(typeof value!=='string'||value.trim()==='')throw new Error(`cftc_missing_${name}`);return value.trim();}
function requiredNumber(value:unknown,name:string):number{const n=toNumber(value);if(n===null)throw new Error(`cftc_invalid_${name}`);return n;}
function nullableNumber(value:unknown):number|null{return value===undefined||value===null||value===''?null:toNumber(value);}
function toNumber(value:unknown):number|null{const n=typeof value==='number'?value:typeof value==='string'?Number(value.replace(/,/g,'')):NaN;return Number.isFinite(n)?n:null;}
function isRecord(value:unknown):value is RecordValue{return typeof value==='object'&&value!==null&&!Array.isArray(value);}
function base(r:ProviderSourceRequest):ProviderSourceResponse{return{requestId:r.requestId,providerId:r.providerId,capability:r.capability,status:'failed',fetchedAt:r.requestedAt,sourceUrl:null,rawPayloadJson:null,errorCode:null,errorMessage:null};}
function fail(r:ProviderSourceRequest,errorCode:string,errorMessage:string,status:'failed'|'unsupported'='failed'):ProviderSourceResponse{return{...base(r),status,errorCode,errorMessage};}
