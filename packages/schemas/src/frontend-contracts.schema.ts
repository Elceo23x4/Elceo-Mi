import type { FrontendAssetDashboardPayload, FrontendContractCoverageReport, FrontendMarketOverviewPayload, FrontendMockPayloadRegistry, FrontendReasoningDiagnostic, FrontendSupportedAsset } from '@elceo/types';
import { FRONTEND_CONTRACT_SURFACES, FRONTEND_USER_VISIBILITY, MARKET_REASONING_DIAGNOSTIC_ASSETS, TRADING_ASSET_COVERAGE } from '@elceo/types';
import { isEnumValue, isIsoDateString, isNonEmptyString, isObjectRecord, type SchemaValidationResult } from './validation-utils';

const FORBIDDEN_TEXT=/\b(buy|sell|hold)\b|guaranteed\s+profit|financial\s+advice/i;
const SECRET_LIKE=/(api[_-]?key|secret|token|password)/i;
const unique = (items: readonly unknown[]) => new Set(items).size === items.length;
const sameMembers = (items: readonly unknown[], expected: readonly string[]) => items.length === expected.length && unique(items) && expected.every((x)=>items.includes(x));

export function validateFrontendSupportedAsset(input: unknown,p=''): SchemaValidationResult<FrontendSupportedAsset>{ const e:string[]=[]; if(!isObjectRecord(input)) return {ok:false,errors:[`${p}must be object`]};
if(!isEnumValue(input.assetId,TRADING_ASSET_COVERAGE)) e.push(`${p}assetId invalid`); if(!isNonEmptyString(input.displaySymbol)||!isNonEmptyString(input.assetName)) e.push(`${p}display fields invalid`);
if(!FRONTEND_USER_VISIBILITY.includes(input.userVisibility as never)) e.push(`${p}visibility invalid`); return e.length?{ok:false,errors:e}:{ok:true,value:input as FrontendSupportedAsset}; }

export function validateFrontendReasoningDiagnostic(input: unknown,p=''): SchemaValidationResult<FrontendReasoningDiagnostic>{ const e:string[]=[]; if(!isObjectRecord(input)) return {ok:false,errors:[`${p}must be object`]};
if(!isEnumValue(input.assetId,MARKET_REASONING_DIAGNOSTIC_ASSETS)) e.push(`${p}assetId invalid`); if(input.supportRole!=='reasoning_diagnostic') e.push(`${p}supportRole invalid`); if(input.tradable!==false) e.push(`${p}tradable must be false`); if(!isNonEmptyString(input.displaySymbol)||!isNonEmptyString(input.assetName)||!isNonEmptyString(input.marketFamily)) e.push(`${p}display fields invalid`); if(!FRONTEND_USER_VISIBILITY.includes(input.userVisibility as never)) e.push(`${p}visibility invalid`); return e.length?{ok:false,errors:e}:{ok:true,value:input as FrontendReasoningDiagnostic}; }

export function validateFrontendMarketOverviewPayload(input: unknown,p=''): SchemaValidationResult<FrontendMarketOverviewPayload>{ const e:string[]=[]; if(!isObjectRecord(input)) return {ok:false,errors:[`${p}must be object`]};
if(!Array.isArray(input.assets)) e.push(`${p}assets invalid`); else { const ids=input.assets.map((x)=>isObjectRecord(x)?x.assetId:undefined); if(!sameMembers(ids,TRADING_ASSET_COVERAGE)) e.push(`${p}assets must contain exactly 12 unique tradable assets`); input.assets.forEach((x,i)=>{const r=validateFrontendSupportedAsset(x,`${p}assets[${i}].`); if(r.ok===false) e.push(...r.errors);}); }
if(!isIsoDateString(input.updatedAt)) e.push(`${p}updatedAt invalid`); return e.length?{ok:false,errors:e}:{ok:true,value:input as FrontendMarketOverviewPayload}; }

export function validateFrontendAssetDashboardPayload(input: unknown,p=''): SchemaValidationResult<FrontendAssetDashboardPayload>{ const e:string[]=[]; if(!isObjectRecord(input)) return {ok:false,errors:[`${p}must be object`]};
for(const k of Object.keys(input)){ if(SECRET_LIKE.test(k)) e.push(`${p}${k} forbidden`);} if(!isEnumValue(input.assetId,TRADING_ASSET_COVERAGE)) e.push(`${p}assetId invalid`);
if(input.disclaimerNote!=='Decision-support preview. No trade recommendation.') e.push(`${p}disclaimerNote invalid`);
if(JSON.stringify(input).match(FORBIDDEN_TEXT)) e.push(`${p}contains forbidden recommendation language`);
if(!isIsoDateString(input.updatedAt)) e.push(`${p}updatedAt invalid`); return e.length?{ok:false,errors:e}:{ok:true,value:input as FrontendAssetDashboardPayload}; }

export function validateFrontendContractCoverageReport(input: unknown,p=''): SchemaValidationResult<FrontendContractCoverageReport>{ const e:string[]=[]; if(!isObjectRecord(input)) return {ok:false,errors:[`${p}must be object`]}; if(!isIsoDateString(input.updatedAt)) e.push(`${p}updatedAt invalid`); const tradable=Array.isArray(input.supportedTradableAssets)?input.supportedTradableAssets:[]; const diagnostic=Array.isArray(input.reasoningDiagnosticAssets)?input.reasoningDiagnosticAssets:[]; if(!sameMembers(tradable,TRADING_ASSET_COVERAGE)) e.push(`${p}supportedTradableAssets invalid`); if(!sameMembers(diagnostic,MARKET_REASONING_DIAGNOSTIC_ASSETS)) e.push(`${p}reasoningDiagnosticAssets invalid`); if(tradable.some((x)=>diagnostic.includes(x))) e.push(`${p}asset role overlap invalid`); if(!Array.isArray(input.surfaces)||!sameMembers(input.surfaces,FRONTEND_CONTRACT_SURFACES)) e.push(`${p}surfaces invalid`); if(input.deterministicOrdering!==true) e.push(`${p}deterministicOrdering invalid`); if(input.liveCallsUsed!==false) e.push(`${p}liveCallsUsed invalid`); return e.length?{ok:false,errors:e}:{ok:true,value:input as FrontendContractCoverageReport}; }

export function validateFrontendMockPayloadRegistry(input: unknown,p=''): SchemaValidationResult<FrontendMockPayloadRegistry>{ const e:string[]=[]; if(!isObjectRecord(input)||!isObjectRecord(input.surfaces)) return {ok:false,errors:[`${p}invalid`]};
for(const s of FRONTEND_CONTRACT_SURFACES){ if(!isObjectRecord(input.surfaces[s])) e.push(`${p}missing surface ${s}`); }
if(!isIsoDateString(input.updatedAt)) e.push(`${p}updatedAt invalid`); return e.length?{ok:false,errors:e}:{ok:true,value:input as FrontendMockPayloadRegistry}; }
