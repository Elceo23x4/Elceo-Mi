import type { FrontendAssetDashboardPayload, FrontendMarketOverviewPayload, FrontendMockPayloadRegistry, FrontendSupportedAsset } from '@elceo/types';
import { FRONTEND_CONTRACT_SURFACES, FRONTEND_USER_VISIBILITY } from '@elceo/types';
import { isIsoDateString, isNonEmptyString, isObjectRecord, type SchemaValidationResult } from './validation-utils';

const LAUNCH_ASSETS = ['xau_usd','eur_usd','gbp_usd','usd_jpy','aud_usd','usd_chf','nzd_usd','usd_cad','btc_usd','nasdaq_100','sp500','de30','dxy','vix'] as const;
const FORBIDDEN_TEXT=/(\bbuy\b|\bsell\b|\bhold\b|guaranteed\s+profit|financial\s+advice)/i;
const SECRET_LIKE=/(api[_-]?key|secret|token|password)/i;

export function validateFrontendSupportedAsset(input: unknown,p=''): SchemaValidationResult<FrontendSupportedAsset>{ const e:string[]=[]; if(!isObjectRecord(input)) return {ok:false,errors:[`${p}must be object`]};
if(!LAUNCH_ASSETS.includes(input.assetId as never)) e.push(`${p}assetId invalid`); if(!isNonEmptyString(input.displaySymbol)||!isNonEmptyString(input.assetName)) e.push(`${p}display fields invalid`);
if(!FRONTEND_USER_VISIBILITY.includes(input.userVisibility as never)) e.push(`${p}visibility invalid`); return e.length?{ok:false,errors:e}:{ok:true,value:input as FrontendSupportedAsset}; }

export function validateFrontendMarketOverviewPayload(input: unknown,p=''): SchemaValidationResult<FrontendMarketOverviewPayload>{ const e:string[]=[]; if(!isObjectRecord(input)) return {ok:false,errors:[`${p}must be object`]};
if(!Array.isArray(input.assets)||input.assets.length!==LAUNCH_ASSETS.length) e.push(`${p}assets invalid`); else input.assets.forEach((x,i)=>{const r=validateFrontendSupportedAsset(x,`${p}assets[${i}].`); if(r.ok===false) e.push(...r.errors);});
if(!isIsoDateString(input.updatedAt)) e.push(`${p}updatedAt invalid`); return e.length?{ok:false,errors:e}:{ok:true,value:input as FrontendMarketOverviewPayload}; }

export function validateFrontendAssetDashboardPayload(input: unknown,p=''): SchemaValidationResult<FrontendAssetDashboardPayload>{ const e:string[]=[]; if(!isObjectRecord(input)) return {ok:false,errors:[`${p}must be object`]};
for(const k of Object.keys(input)){ if(SECRET_LIKE.test(k)) e.push(`${p}${k} forbidden`);} if(!LAUNCH_ASSETS.includes(input.assetId as never)) e.push(`${p}assetId invalid`);
if(input.disclaimerNote!=='Decision-support preview. No trade recommendation.') e.push(`${p}disclaimerNote invalid`);
if(JSON.stringify(input).match(FORBIDDEN_TEXT)) e.push(`${p}contains forbidden recommendation language`);
if(!isIsoDateString(input.updatedAt)) e.push(`${p}updatedAt invalid`); return e.length?{ok:false,errors:e}:{ok:true,value:input as FrontendAssetDashboardPayload}; }

export function validateFrontendMockPayloadRegistry(input: unknown,p=''): SchemaValidationResult<FrontendMockPayloadRegistry>{ const e:string[]=[]; if(!isObjectRecord(input)||!isObjectRecord(input.surfaces)) return {ok:false,errors:[`${p}invalid`]};
for(const s of FRONTEND_CONTRACT_SURFACES){ if(!isObjectRecord(input.surfaces[s])) e.push(`${p}missing surface ${s}`); }
if(!isIsoDateString(input.updatedAt)) e.push(`${p}updatedAt invalid`); return e.length?{ok:false,errors:e}:{ok:true,value:input as FrontendMockPayloadRegistry}; }
