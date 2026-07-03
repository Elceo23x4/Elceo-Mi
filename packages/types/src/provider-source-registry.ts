export const PROVIDER_SOURCE_IDS = [
  'tiingo_market_data','public_market_price_exchange','index_futures_shell','fred_macro','us_treasury_official','federal_reserve_official','ecb_official','boe_official','boj_official','eurostat_official','bls_official','bea_official','census_official','ons_official','destatis_official','ifo_shell','zew_shell','ism_shell','cftc_cot','marketaux_news','newsapi_news','gdelt_news','finnhub_news','firecrawl_extraction','sec_edgar','etf_flows_shell','earnings_filings_shell','crypto_exchange_public','crypto_onchain_public','crypto_derivatives_shell','volatility_metric_source','credit_stress_source','liquidity_condition_source','financial_conditions_source','public_equity_breadth_sources','calculated_internal_conditions','equity_index_breadth_indicator','imf_official','world_bank_official','oecd_official','bis_official','uk_dmo_official','japan_mof_official'
] as const;
export type ProviderSourceId = typeof PROVIDER_SOURCE_IDS[number];

export const PROVIDER_SOURCE_FAMILIES = ['market_data','macro_official','positioning','news_extraction','filings_company_etf','crypto','risk_liquidity'] as const;
export type ProviderSourceFamily = typeof PROVIDER_SOURCE_FAMILIES[number];

export const PROVIDER_SOURCE_CAPABILITY_KINDS = ['market_price','index_futures_proxy','macro_timeseries','policy_event','positioning_report','news_headlines','news_extraction','filings_feed','etf_flows','earnings_calendar','onchain_metric','derivatives_proxy','volatility_metric','credit_stress_metric','liquidity_metric','financial_conditions_metric'] as const;
export type ProviderSourceCapabilityKind = typeof PROVIDER_SOURCE_CAPABILITY_KINDS[number];

export const PROVIDER_ACTIVATION_STAGES = ['not_started','fixture_ready','dry_run_ready','live_blocked'] as const;
export type ProviderActivationStage = typeof PROVIDER_ACTIVATION_STAGES[number];
export const PROVIDER_FIXTURE_READINESS = ['none','planned','partial','ready'] as const;
export type ProviderFixtureReadiness = typeof PROVIDER_FIXTURE_READINESS[number];
export const PROVIDER_LIVE_ACTIVATION_MODES = ['blocked_by_default','manual_gated','not_allowed'] as const;
export type ProviderLiveActivationMode = typeof PROVIDER_LIVE_ACTIVATION_MODES[number];
export const PROVIDER_CREDENTIAL_REQUIREMENTS = ['none','api_key_required','oauth_required','unknown'] as const;
export type ProviderCredentialRequirement = typeof PROVIDER_CREDENTIAL_REQUIREMENTS[number];
export const PROVIDER_SOURCE_STATUSES = ['fixture_ready','dry_run_ready','live_blocked','not_started'] as const;
export type ProviderSourceStatus = typeof PROVIDER_SOURCE_STATUSES[number];

import type { TradingAssetCoverage } from './market-evidence';
export const MARKET_REASONING_DIAGNOSTIC_ASSETS = ['dxy','vix'] as const;
export type TradableLaunchAsset = TradingAssetCoverage;
export type MarketReasoningDiagnosticAsset = typeof MARKET_REASONING_DIAGNOSTIC_ASSETS[number];
export type MarketReasoningAsset = TradableLaunchAsset | MarketReasoningDiagnosticAsset;
export type MarketAssetSupportRole = 'launch_tradable'|'reasoning_diagnostic';
export type LaunchAsset = TradingAssetCoverage;
/** @deprecated Historical 14-asset provider/reasoning union. Use MarketReasoningAsset. */
export type LegacyProviderReasoningAsset = MarketReasoningAsset;

export type ProviderCapabilityDescriptor = {
  capabilityKind: ProviderSourceCapabilityKind; evidenceTypeId: string; activationStage: ProviderActivationStage; fixtureReadiness: ProviderFixtureReadiness; dryRunSupported: boolean; liveActivationMode: ProviderLiveActivationMode;
};
export type ProviderAssetCoverageDescriptor = { asset: MarketReasoningAsset; supportRole: MarketAssetSupportRole; sourceIds: ProviderSourceId[]; themes: string[]; };
export type ProviderSourceDescriptor = {
  sourceId: ProviderSourceId; family: ProviderSourceFamily; displayName: string; status: ProviderSourceStatus; activationStage: ProviderActivationStage; fixtureReadiness: ProviderFixtureReadiness; liveActivationMode: ProviderLiveActivationMode; credentialRequirement: ProviderCredentialRequirement; capabilities: ProviderCapabilityDescriptor[]; assets: MarketReasoningAsset[]; notes: string;
};
export type ProviderSourceGap = { gapId: string; sourceId: ProviderSourceId; asset: MarketReasoningAsset | 'all'; severity: 'low'|'medium'|'high'; reason: string; blockedBy: 'fixture_missing'|'dry_run_missing'|'live_blocked_by_policy'|'integration_not_started'; };
export type ProviderSourceActivationChecklistItem = { checklistItemId: string; sourceId: ProviderSourceId; order: number; description: string; required: boolean; done: boolean; blocked: boolean; };

export type ProviderSourceRegistrySnapshot = {
  generatedAt: string; sources: ProviderSourceDescriptor[]; reasoningAssetCoverage: ProviderAssetCoverageDescriptor[]; launchTradableAssetCoverage: ProviderAssetCoverageDescriptor[]; reasoningDiagnosticAssetCoverage: ProviderAssetCoverageDescriptor[]; launchTradableAssetCount: number; reasoningDiagnosticAssetCount: number; representedReasoningAssetCount: number; gaps: ProviderSourceGap[]; activationChecklistBySource: Record<ProviderSourceId, ProviderSourceActivationChecklistItem[]>;
};
