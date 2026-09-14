import type { MarketDataProviderDescriptor, NormalizedMarketEvidencePayload, ProviderCapabilityKind, ProviderSourceRequest, ProviderSourceResponse } from '@elceo/types';
import type { MarketEvidenceProviderAdapter } from '../normalization-contracts';
import { getProviderDescriptor } from '../provider-capability-registry';
import { FredOfficialAdapter } from './fred-adapter';
import { EcbOfficialAdapter } from './ecb-adapter';
import { UsTreasuryOfficialAdapter } from './us-treasury-adapter';
import { createBankOfCanadaPolicyOfficialAdapter, createBeaGrowthOfficialAdapter, createBlsInflationOfficialAdapter, createBlsLaborOfficialAdapter, createBoePolicyOfficialAdapter, createCensusGrowthOfficialAdapter, createEiaEnergyOfficialAdapter, createRbaPolicyOfficialAdapter, createRbnzPolicyOfficialAdapter, createStatisticsCanadaMacroOfficialAdapter, createWorldBankGrowthOfficialAdapter, type VerifiedOfficialAdapterConfig } from './verified-series-adapters';

export type OfficialAdapterReadiness='live_capable'|'fixture_parser_ready'|'blocked_profile'|'blocked_entitlement';
export type OfficialAdapterCatalogEntry={gateSourceId:string;canonicalSourceId:string;capability:ProviderCapabilityKind;readiness:OfficialAdapterReadiness;reason:string;factory:(config:OfficialAdapterFactoryConfig)=>MarketEvidenceProviderAdapter|null};
export type OfficialAdapterFactoryConfig=VerifiedOfficialAdapterConfig&{fredApiKey?:string|null;beaApiKey?:string|null;censusApiKey?:string|null;blsApiKey?:string|null;eiaApiKey?:string|null;statsNzSubscriptionKey?:string|null;secUserAgent?:string|null};
type BlockedFixture={date:string;value:number;label:string;region:string;evidenceClass:string};

const base=(r:ProviderSourceRequest):ProviderSourceResponse=>({requestId:r.requestId,providerId:r.providerId,capability:r.capability,status:'failed',fetchedAt:new Date().toISOString(),sourceUrl:null,rawPayloadJson:null,errorCode:null,errorMessage:null});
const createFailClosedAdapter=(providerId:string,canonicalSourceId:string,capability:ProviderCapabilityKind,reason:string,fixture:BlockedFixture):MarketEvidenceProviderAdapter|null=>{
 const descriptor:MarketDataProviderDescriptor|null=getProviderDescriptor(providerId);if(!descriptor)return null;
 return {
  descriptor,
  fetch:async request=>request.providerId===providerId&&request.capability===capability?{...base(request),status:'success',sourceUrl:`fixture://${providerId}/${capability}`,rawPayloadJson:JSON.stringify([fixture])}:{...base(request),errorCode:'official_source_request_mismatch',errorMessage:'official_source_request_mismatch'},
  normalize:async response=>{
   if(!response.rawPayloadJson)return[];
   const rows=JSON.parse(response.rawPayloadJson) as BlockedFixture[];
   return rows.map((row,index):NormalizedMarketEvidencePayload=>({payloadId:`${response.requestId}:${index}`,evidenceTypeId:response.capability,evidenceClass:row.evidenceClass,providerId:canonicalSourceId,sourceId:canonicalSourceId,region:row.region,asset:null,observedAt:/^\d{4}-Q[1-4]$/.test(row.date)?new Date(Date.UTC(Number(row.date.slice(0,4)),(Number(row.date.slice(-1))-1)*3,1)).toISOString():/^\d{4}$/.test(row.date)?`${row.date}-01-01T00:00:00.000Z`:new Date(row.date.length===10?`${row.date}T00:00:00Z`:row.date).toISOString(),publishedAt:null,normalizedAt:response.fetchedAt,confidenceScore:70,dataQuality:'partial',valuesJson:JSON.stringify({value:row.value,label:row.label}),metadataJson:JSON.stringify({canonicalSourceId,gateSourceId:providerId,requestId:response.requestId,readiness:'fixture_parser_ready',liveBlockedReason:reason})}));
  }
 };
};
const blocked=(gateSourceId:string,canonicalSourceId:string,capability:ProviderCapabilityKind,reason:string,fixture:BlockedFixture,readiness:OfficialAdapterReadiness='blocked_profile'):OfficialAdapterCatalogEntry=>({gateSourceId,canonicalSourceId,capability,readiness,reason,factory:()=>createFailClosedAdapter(gateSourceId,canonicalSourceId,capability,reason,fixture)});
const verifiedConfig=(c:OfficialAdapterFactoryConfig,apiKey?:string|null):VerifiedOfficialAdapterConfig=>({...c,...(apiKey!==undefined?{apiKey}:{}),...(c.fetchImpl?{fetchImpl:c.fetchImpl}:{})});
const fredConfig=(c:OfficialAdapterFactoryConfig)=>({...(c.mode?{mode:c.mode}:{}),...(c.fredApiKey??c.apiKey?{apiKey:c.fredApiKey??c.apiKey}:{}),...(c.fetchImpl?{fetchImpl:c.fetchImpl}:{})});
const simpleConfig=(c:OfficialAdapterFactoryConfig)=>({...(c.mode?{mode:c.mode}:{}),...(c.fetchImpl?{fetchImpl:c.fetchImpl}:{})});

export const OFFICIAL_ADAPTER_CATALOG:readonly OfficialAdapterCatalogEntry[]=[
 {gateSourceId:'fred',canonicalSourceId:'fred_macro',capability:'real_yield_series',readiness:'live_capable',reason:'server-owned FRED DFII10 profile',factory:c=>new FredOfficialAdapter(fredConfig(c))},
 {gateSourceId:'fred',canonicalSourceId:'fred_macro',capability:'financial_conditions_index',readiness:'live_capable',reason:'server-owned FRED NFCI profile',factory:c=>new FredOfficialAdapter(fredConfig(c))},
 {gateSourceId:'ecb_public',canonicalSourceId:'ecb_official',capability:'policy_rate_series',readiness:'live_capable',reason:'server-owned ECB deposit-facility profile',factory:c=>new EcbOfficialAdapter(simpleConfig(c))},
 {gateSourceId:'us_treasury',canonicalSourceId:'us_treasury_official',capability:'nominal_yield_series',readiness:'live_capable',reason:'server-owned Treasury nominal curve profile',factory:c=>new UsTreasuryOfficialAdapter(simpleConfig(c))},
 {gateSourceId:'us_treasury',canonicalSourceId:'us_treasury_official',capability:'real_yield_series',readiness:'live_capable',reason:'server-owned Treasury real curve profile',factory:c=>new UsTreasuryOfficialAdapter(simpleConfig(c))},
 {gateSourceId:'bls_official',canonicalSourceId:'bls_official',capability:'inflation_indicator',readiness:'live_capable',reason:'BLS CPI-U series CUSR0000SA0',factory:c=>createBlsInflationOfficialAdapter(verifiedConfig(c,c.blsApiKey??c.apiKey))},
 {gateSourceId:'bls_official',canonicalSourceId:'bls_official',capability:'labor_market_indicator',readiness:'live_capable',reason:'BLS unemployment series LNS14000000',factory:c=>createBlsLaborOfficialAdapter(verifiedConfig(c,c.blsApiKey??c.apiKey))},
 {gateSourceId:'bea_official',canonicalSourceId:'bea_official',capability:'growth_activity_indicator',readiness:'live_capable',reason:'BEA NIPA T10101 quarterly GDP profile',factory:c=>createBeaGrowthOfficialAdapter(verifiedConfig(c,c.beaApiKey??c.apiKey))},
 {gateSourceId:'census_official',canonicalSourceId:'census_official',capability:'growth_activity_indicator',readiness:'live_capable',reason:'Census EITS monthly retail trade profile',factory:c=>createCensusGrowthOfficialAdapter(verifiedConfig(c,c.censusApiKey??c.apiKey))},
 {gateSourceId:'boe_official',canonicalSourceId:'boe_official',capability:'policy_rate_series',readiness:'live_capable',reason:'BoE IADB IUDBEDR Official Bank Rate',factory:c=>createBoePolicyOfficialAdapter(verifiedConfig(c))},
 {gateSourceId:'rba_official',canonicalSourceId:'rba_official',capability:'policy_rate_series',readiness:'live_capable',reason:'RBA official cash-rate target table',factory:c=>createRbaPolicyOfficialAdapter(verifiedConfig(c))},
 {gateSourceId:'rbnz_official',canonicalSourceId:'rbnz_official',capability:'policy_rate_series',readiness:'live_capable',reason:'RBNZ official OCR decision history',factory:c=>createRbnzPolicyOfficialAdapter(verifiedConfig(c))},
 {gateSourceId:'bank_of_canada_official',canonicalSourceId:'bank_of_canada_official',capability:'policy_rate_series',readiness:'live_capable',reason:'Bank of Canada Valet V39079',factory:c=>createBankOfCanadaPolicyOfficialAdapter(verifiedConfig(c))},
 {gateSourceId:'statistics_canada_official',canonicalSourceId:'statistics_canada_official',capability:'macro_indicator_series',readiness:'live_capable',reason:'Statistics Canada WDS CPI vector 41690973',factory:c=>createStatisticsCanadaMacroOfficialAdapter(verifiedConfig(c))},
 {gateSourceId:'eia_official',canonicalSourceId:'eia_official',capability:'energy_commodity_series',readiness:'live_capable',reason:'EIA API v2 WTI RWTC profile',factory:c=>createEiaEnergyOfficialAdapter(verifiedConfig(c,c.eiaApiKey??c.apiKey))},
 {gateSourceId:'world_bank_official',canonicalSourceId:'world_bank_official',capability:'growth_activity_indicator',readiness:'live_capable',reason:'World Bank V2 WLD GDP growth indicator',factory:c=>createWorldBankGrowthOfficialAdapter(verifiedConfig(c))},
 blocked('federal_reserve','federal_reserve_official','central_bank_balance_sheet','Federal Reserve H.4.1 replacement machine profile not yet pinned',{date:'2026-09-10',value:1,label:'H.4.1 fixture marker',region:'united_states',evidenceClass:'central_bank_balance_sheet'},'fixture_parser_ready'),
 blocked('sec_edgar','sec_edgar','regulatory_filing_reference','SEC EDGAR bounded CIK/use-case profile not yet pinned',{date:'2026-06-30',value:1,label:'SEC filing fixture marker',region:'united_states',evidenceClass:'regulatory_filings'},'fixture_parser_ready'),
 blocked('eurostat_official','eurostat_official','inflation_indicator','Eurostat HICP dimensions not yet pinned',{date:'2026-06-01',value:2.2,label:'Euro-area HICP fixture marker',region:'euro_area',evidenceClass:'inflation'},'fixture_parser_ready'),
 blocked('destatis_official','destatis_official','inflation_indicator','GENESIS CPI table/filter contract not yet pinned',{date:'2026-06-01',value:2.0,label:'Germany CPI fixture marker',region:'germany',evidenceClass:'inflation'},'fixture_parser_ready'),
 blocked('ons_official','ons_official','inflation_indicator','ONS CPIH observation dimensions not yet pinned',{date:'2026-06-01',value:3.1,label:'UK CPIH fixture marker',region:'united_kingdom',evidenceClass:'inflation'},'fixture_parser_ready'),
 blocked('uk_dmo_official','uk_dmo_official','debt_supply_calendar','UK DMO machine-download profile not yet pinned',{date:'2026-06-01',value:1,label:'UK DMO issuance fixture marker',region:'united_kingdom',evidenceClass:'government_debt_supply'},'fixture_parser_ready'),
 blocked('boj_public','boj_official','policy_rate_series','BOJ 2026 API path/series contract not yet pinned',{date:'2026-06-17',value:0.5,label:'BOJ policy fixture marker',region:'japan',evidenceClass:'central_bank_policy'},'fixture_parser_ready'),
 blocked('japan_mof_official','japan_mof_official','macro_indicator_series','MOF intervention file requires trusted release-index resolution',{date:'2026-06-30',value:0,label:'Japan FX intervention fixture marker',region:'japan',evidenceClass:'economic_indicator'},'fixture_parser_ready'),
 blocked('snb_official','snb_official','policy_rate_series','SNB policy-rate cube/dimensions not yet pinned',{date:'2026-06-19',value:0,label:'SNB policy fixture marker',region:'switzerland',evidenceClass:'central_bank_policy'},'fixture_parser_ready'),
 blocked('swiss_fso_official','swiss_fso_official','macro_indicator_series','Swiss FSO PxWeb table/dimensions not yet pinned',{date:'2026-06-01',value:1,label:'Swiss macro fixture marker',region:'switzerland',evidenceClass:'economic_indicator'},'fixture_parser_ready'),
 blocked('abs_official','abs_official','macro_indicator_series','ABS SDMX dataflow/dimensions not yet pinned',{date:'2026-Q2',value:1,label:'Australia macro fixture marker',region:'australia',evidenceClass:'economic_indicator'},'fixture_parser_ready'),
 blocked('stats_nz_official','stats_nz_official','macro_indicator_series','Stats NZ subscription/product profile required',{date:'2026-Q2',value:1,label:'New Zealand macro fixture marker',region:'new_zealand',evidenceClass:'economic_indicator'},'fixture_parser_ready'),
 blocked('imf_official','imf_official','macro_indicator_series','IMF current SDMX dataflow not yet pinned',{date:'2025',value:1,label:'IMF macro fixture marker',region:'global',evidenceClass:'economic_indicator'},'fixture_parser_ready'),
 blocked('oecd_official','oecd_official','growth_activity_indicator','OECD growth/CLI flow/key not yet pinned',{date:'2026-06-01',value:1,label:'OECD growth fixture marker',region:'global',evidenceClass:'growth_activity'},'fixture_parser_ready'),
 blocked('bis_official','bis_official','cross_market_rate_series','BIS cross-market dataflow/key not yet pinned',{date:'2026-06-01',value:1,label:'BIS cross-market fixture marker',region:'global',evidenceClass:'cross_market_rates'},'fixture_parser_ready')
] as const;

export const getOfficialAdapterCatalogEntry=(gateSourceId:string,capability:ProviderCapabilityKind)=>OFFICIAL_ADAPTER_CATALOG.find(x=>x.gateSourceId===gateSourceId&&x.capability===capability)??null;
export const createOfficialAdapter=(gateSourceId:string,capability:ProviderCapabilityKind,config:OfficialAdapterFactoryConfig={}):MarketEvidenceProviderAdapter|null=>getOfficialAdapterCatalogEntry(gateSourceId,capability)?.factory(config)??null;
export const listOfficialLiveCapableAdapters=()=>OFFICIAL_ADAPTER_CATALOG.filter(x=>x.readiness==='live_capable');
