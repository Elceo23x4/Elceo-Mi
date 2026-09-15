import type { ProviderCapabilityKind, ProviderSourceId } from '@elceo/types';
import type { MarketEvidenceProviderAdapter } from '../provider-sources/normalization-contracts';
import { CftcCotAdapter, type CftcCotRuntimeConfig } from '../provider-sources/cot/cot-adapter';
import { FinnhubMacroCalendarEvidenceAdapter, FinnhubMarketDataFallbackAdapter, type FinnhubRuntimeConfig } from '../provider-sources/finnhub/finnhub-adapter';
import { GdeltNewsAdapter, MarketauxMarketNewsAdapter, type GdeltRuntimeConfig, type MarketauxRuntimeConfig } from '../provider-sources/news/news-adapters';
import { EcbOfficialAdapter, type EcbAdapterConfig } from '../provider-sources/official/ecb-adapter';
import { FredOfficialAdapter, type FredAdapterConfig } from '../provider-sources/official/fred-adapter';
import { createOfficialAdapter, type OfficialAdapterFactoryConfig } from '../provider-sources/official/official-adapter-catalog';
import { UsTreasuryOfficialAdapter, type TreasuryAdapterConfig } from '../provider-sources/official/us-treasury-adapter';
import { TiingoMarketDataAdapter, type TiingoRuntimeConfig } from '../provider-sources/tiingo/tiingo-adapter';

export type EvidenceGateExecutionProfile={
 canonicalSourceId:ProviderSourceId;
 dfcCapabilityId:string;
 gateSourceId:string;
 providerCapabilityId:ProviderCapabilityKind;
 requestParams:Record<string,unknown>;
 adapter:MarketEvidenceProviderAdapter;
};
export type EvidenceExecutionConfig={
 tiingo?:TiingoRuntimeConfig;
 cftc?:CftcCotRuntimeConfig;
 finnhub?:FinnhubRuntimeConfig;
 marketaux?:MarketauxRuntimeConfig;
 gdelt?:GdeltRuntimeConfig;
 official?:OfficialAdapterFactoryConfig;
 /** Backward-compatible direct configs for the original DFC executable set. */
 fred?:FredAdapterConfig;
 ecb?:EcbAdapterConfig;
 treasury?:TreasuryAdapterConfig;
};

type ProfileDefinition={gateSourceId:string;providerCapabilityId:ProviderCapabilityKind;requestParams:Record<string,unknown>;build:(config:EvidenceExecutionConfig)=>MarketEvidenceProviderAdapter};
const requiredOfficial=(gateSourceId:string,providerCapabilityId:ProviderCapabilityKind,config:EvidenceExecutionConfig):MarketEvidenceProviderAdapter=>createOfficialAdapter(gateSourceId,providerCapabilityId,config.official)??(()=>{throw new Error(`missing_official_execution_profile:${gateSourceId}:${providerCapabilityId}`);})();
const official=(gateSourceId:string,providerCapabilityId:ProviderCapabilityKind,requestParams:Record<string,unknown>):ProfileDefinition=>({gateSourceId,providerCapabilityId,requestParams,build:config=>requiredOfficial(gateSourceId,providerCapabilityId,config)});

const PROFILES=new Map<string,ProfileDefinition>([
 ['tiingo_market_data:direct_price',{gateSourceId:'tiingo_market_data',providerCapabilityId:'market_price_history',requestParams:{frequency:'daily'},build:config=>new TiingoMarketDataAdapter(config.tiingo)}],
 ['finnhub_market_data:direct_price',{gateSourceId:'finnhub_market_data',providerCapabilityId:'market_price_history',requestParams:{frequency:'daily',fallbackFor:'tiingo_market_data'},build:config=>new FinnhubMarketDataFallbackAdapter(config.finnhub)}],
 ['finnhub_macro:macro_calendar_expectations',{gateSourceId:'finnhub_macro',providerCapabilityId:'economic_calendar',requestParams:{profile:'economic_calendar',authority:'secondary'},build:config=>new FinnhubMacroCalendarEvidenceAdapter(config.finnhub)}],
 ['marketaux_news:market_news',{gateSourceId:'marketaux_news',providerCapabilityId:'market_news_feed',requestParams:{profile:'launch_financial_news',lookbackHours:3},build:config=>new MarketauxMarketNewsAdapter(config.marketaux)}],
 ['gdelt_news:market_news',{gateSourceId:'gdelt_news',providerCapabilityId:'market_news_feed',requestParams:{profile:'market_news_fallback',lookbackHours:3},build:config=>new GdeltNewsAdapter(config.gdelt)}],
 ['gdelt_news:geopolitical_risk',{gateSourceId:'gdelt_news',providerCapabilityId:'geopolitical_risk_event',requestParams:{profile:'geopolitical_risk',lookbackHours:3},build:config=>new GdeltNewsAdapter(config.gdelt)}],
 ['cftc_cot:positioning',{gateSourceId:'cftc_cot',providerCapabilityId:'cot_report',requestParams:{profile:'6dca-aqww:legacy_futures_only'},build:config=>new CftcCotAdapter(config.cftc)}],
 ['fred_macro:real_yields',{gateSourceId:'fred',providerCapabilityId:'real_yield_series',requestParams:{seriesId:'DFII10'},build:config=>new FredOfficialAdapter(config.fred)}],
 ['fred_macro:financial_conditions',{gateSourceId:'fred',providerCapabilityId:'financial_conditions_index',requestParams:{seriesId:'NFCI'},build:config=>new FredOfficialAdapter(config.fred)}],
 ['ecb_official:ecb_policy',{gateSourceId:'ecb_public',providerCapabilityId:'policy_rate_series',requestParams:{series:'deposit_facility'},build:config=>new EcbOfficialAdapter(config.ecb)}],
 ['us_treasury_official:treasury_yields',{gateSourceId:'us_treasury',providerCapabilityId:'nominal_yield_series',requestParams:{dataset:'daily_treasury_yield_curve'},build:config=>new UsTreasuryOfficialAdapter(config.treasury)}],
 ['us_treasury_official:real_yields',{gateSourceId:'us_treasury',providerCapabilityId:'real_yield_series',requestParams:{dataset:'daily_treasury_real_yield_curve'},build:config=>new UsTreasuryOfficialAdapter(config.treasury)}],
 ['federal_reserve_official:usd_liquidity',official('federal_reserve','central_bank_balance_sheet',{profile:'H41:H41/RESPPA_N.WW'})],
 ['bls_official:us_macro',official('bls_official','inflation_indicator',{profile:'CUSR0000SA0'})],
 ['bea_official:us_macro',official('bea_official','growth_activity_indicator',{profile:'NIPA:T10101:Q'})],
 ['census_official:us_macro',official('census_official','growth_activity_indicator',{profile:'EITS:MRTS'})],
 ['eurostat_official:euro_german_macro',official('eurostat_official','inflation_indicator',{profile:'prc_hicp_minr:M:RCH_A:TOTAL:EA21'})],
 ['boe_official:boe_policy',official('boe_official','policy_rate_series',{profile:'IUDBEDR'})],
 ['ons_official:uk_macro',official('ons_official','inflation_indicator',{profile:'L55O:CPIH_ALL_ITEMS_ANNUAL_RATE'})],
 ['boj_official:boj_policy',official('boj_public','policy_rate_series',{profile:'FM01:STRDCLUCON'})],
 ['snb_official:snb_policy',official('snb_official','policy_rate_series',{profile:'snboffzisa:D0(LZ)'})],
 ['rba_official:rba_policy',official('rba_official','policy_rate_series',{profile:'cash_rate_target'})],
 ['abs_official:australia_macro',official('abs_official','inflation_indicator',{profile:'ABS,CPI,2.0.0/1.10001.10.50.M'})],
 ['rbnz_official:rbnz_policy',official('rbnz_official','policy_rate_series',{profile:'OCR_DECISION_HISTORY'})],
 ['bank_of_canada_official:boc_policy',official('bank_of_canada_official','policy_rate_series',{profile:'V39079'})],
 ['statistics_canada_official:canada_macro',official('statistics_canada_official','macro_indicator_series',{profile:'vector:41690973'})],
 ['eia_official:energy_context',official('eia_official','energy_commodity_series',{profile:'RWTC'})],
 ['world_bank_official:global_demand',official('world_bank_official','growth_activity_indicator',{profile:'NY.GDP.MKTP.KD.ZG'})],
 ['oecd_official:global_demand',official('oecd_official','growth_activity_indicator',{profile:'OECD.SDD.STES,DSD_STES@DF_CLI,4.1:G20.M.LI...AA...H'})],
 ['cboe_official:vix_direct_index_delayed',official('cboe_official','end_of_day_prices',{profile:'VIX:EOD_DIRECT_INDEX'})]
]);

export function resolveEvidenceGateExecution(canonicalSourceId:ProviderSourceId,dfcCapabilityId:string,config:EvidenceExecutionConfig={}):EvidenceGateExecutionProfile|null{
 const profile=PROFILES.get(`${canonicalSourceId}:${dfcCapabilityId}`);if(!profile)return null;
 return{canonicalSourceId,dfcCapabilityId,gateSourceId:profile.gateSourceId,providerCapabilityId:profile.providerCapabilityId,requestParams:structuredClone(profile.requestParams),adapter:profile.build(config)};
}
export function listEvidenceGateExecutionProfiles(){return [...PROFILES.entries()].map(([route,profile])=>({route,gateSourceId:profile.gateSourceId,providerCapabilityId:profile.providerCapabilityId,requestParams:structuredClone(profile.requestParams)}));}
