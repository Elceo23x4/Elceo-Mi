import type { LaunchAsset, MarketAssetSupportRole, ProviderSourceId } from './provider-source-registry';
import type { MarketReasoningModuleReadiness as Readiness } from './market-reasoning-readiness';

export const MARKET_ASSET_CAUSALITY_ASSETS = ['xau_usd','eur_usd','gbp_usd','usd_jpy','aud_usd','usd_chf','nzd_usd','usd_cad','btc_usd','nasdaq_100','sp500','de30','dxy','vix'] as const;
export type MarketAssetCausalityAsset = typeof MARKET_ASSET_CAUSALITY_ASSETS[number];
export const MARKET_ASSET_FAMILIES = ['precious_metals','fx_major','fx_safe_haven','fx_commodity','crypto','equity_index_us','equity_index_europe','dollar_index','volatility_index'] as const;
export type MarketAssetFamily = typeof MARKET_ASSET_FAMILIES[number];
export const MARKET_ASSET_DRIVER_KINDS = ['real_yields','nominal_yields','central_bank_policy','policy_rate_expectations','inflation_surprise','growth_surprise','labor_market_surprise','dollar_liquidity','financial_conditions','credit_stress','risk_sentiment','volatility_surface','equity_breadth','earnings_macro','positioning_cot','futures_positioning','etf_flows','fund_flows','central_bank_demand','safe_haven_demand','geopolitical_risk','energy_commodities','oil_energy','crypto_onchain','crypto_derivatives','crypto_etf_flows','regulatory_risk','cross_market_rates','yield_differentials','intervention_risk','fiscal_risk','industrial_cycle','china_demand','commodity_terms_of_trade','liquidity_conditions','market_price_structure','event_reaction'] as const;
export type MarketAssetDriverKind = typeof MARKET_ASSET_DRIVER_KINDS[number];
export const MARKET_ASSET_DRIVER_IMPORTANCE = ['primary','secondary','contextual'] as const;
export type MarketAssetDriverImportance = typeof MARKET_ASSET_DRIVER_IMPORTANCE[number];
export const MARKET_ASSET_DRIVER_DIRECTION_SENSITIVITIES = ['direct_positive','direct_negative','inverse','relative','regime_dependent','pair_base_positive','pair_quote_positive','requires_direction_resolver','requires_surprise_normalization','requires_price_confirmation'] as const;
export type MarketAssetDriverDirectionSensitivity = typeof MARKET_ASSET_DRIVER_DIRECTION_SENSITIVITIES[number];
export const MARKET_ASSET_REGIME_MODIFIER_KINDS = ['risk_on','risk_off','inflation_shock','growth_scare','policy_surprise','liquidity_stress','credit_stress','volatility_shock','energy_shock','geopolitical_shock','intervention_watch','event_window','trend_confirmation','range_bound','crypto_leverage_cycle'] as const;
export type MarketAssetRegimeModifierKind = typeof MARKET_ASSET_REGIME_MODIFIER_KINDS[number];
export const MARKET_ASSET_CONTRADICTION_TRIGGER_KINDS = ['driver_price_divergence','rates_price_divergence','macro_price_divergence','breadth_index_divergence','volatility_equity_divergence','credit_risk_divergence','liquidity_risk_divergence','flow_price_divergence','positioning_price_divergence','news_price_divergence','base_quote_pressure_conflict','safe_haven_risk_conflict','provider_freshness_conflict','provider_activation_gap','event_reaction_failure'] as const;
export type MarketAssetContradictionTriggerKind = typeof MARKET_ASSET_CONTRADICTION_TRIGGER_KINDS[number];
export const MARKET_ASSET_FRESHNESS_SENSITIVITIES = ['low','medium','high','very_high'] as const;
export type MarketAssetFreshnessSensitivity = typeof MARKET_ASSET_FRESHNESS_SENSITIVITIES[number];
export const MARKET_ASSET_PRICE_CONFIRMATION_NEEDS = ['low','medium','high','event_window_required'] as const;
export type MarketAssetPriceConfirmationNeed = typeof MARKET_ASSET_PRICE_CONFIRMATION_NEEDS[number];
export const MARKET_ASSET_MACRO_EVENT_SENSITIVITIES = ['low','medium','high','very_high'] as const;
export type MarketAssetMacroEventSensitivity = typeof MARKET_ASSET_MACRO_EVENT_SENSITIVITIES[number];
export const MARKET_ASSET_PROVIDER_DEPENDENCY_TIERS = ['must_have','important','nice_to_have'] as const;
export type MarketAssetProviderDependencyTier = typeof MARKET_ASSET_PROVIDER_DEPENDENCY_TIERS[number];
export const MARKET_ASSET_COVERAGE_STATUSES = ['mapped_contract_valid','partially_covered','pending_provider_activation','live_provider_integration','empirical_validation','production_calibration'] as const;
export type MarketAssetCoverageStatus = typeof MARKET_ASSET_COVERAGE_STATUSES[number];

export type MarketAssetCausalityDriver = { driverId: string; kind: MarketAssetDriverKind; importance: MarketAssetDriverImportance; evidenceClasses: string[]; directionSensitivity: MarketAssetDriverDirectionSensitivity[]; interpretation: string; rationale: string; };
export type MarketAssetRegimeModifier = { modifierId: string; kind: MarketAssetRegimeModifierKind; interpretation: string; rationale: string; };
export type MarketAssetContradictionTrigger = { triggerId: string; kind: MarketAssetContradictionTriggerKind; detectionIntent: string; rationale: string; };
export type MarketAssetProviderDependency = { dependencyId: string; tier: MarketAssetProviderDependencyTier; sourceIds: ProviderSourceId[]; evidenceClasses: string[]; currentStatus: MarketAssetCoverageStatus; rationale: string; };
export type MarketAssetDirectionResolutionRequirement = { requirementId: string; asset: MarketAssetCausalityAsset; requiresBasePressure: boolean; requiresQuotePressure: boolean; requiresRelativeStrength: boolean; requiresSurpriseNormalization: boolean; requiresPriceConfirmation: boolean; rationale: string; };
export type MarketAssetCausalityDescriptor = { asset: MarketAssetCausalityAsset; displayName: string; family: MarketAssetFamily; primaryDrivers: MarketAssetCausalityDriver[]; secondaryDrivers: MarketAssetCausalityDriver[]; contextualDrivers: MarketAssetCausalityDriver[]; regimeModifiers: MarketAssetRegimeModifier[]; contradictionTriggers: MarketAssetContradictionTrigger[]; freshnessSensitivity: MarketAssetFreshnessSensitivity; priceConfirmationNeeds: MarketAssetPriceConfirmationNeed; macroEventSensitivity: MarketAssetMacroEventSensitivity; providerDependencies: MarketAssetProviderDependency[]; directionResolutionRequirements: MarketAssetDirectionResolutionRequirement[]; currentCodeCoverage: string[]; knownGaps: MarketAssetCausalityGap[]; deterministicModuleDependencies: string[]; rationale: string; };
export type MarketAssetCausalityGap = { gapId: string; asset: MarketAssetCausalityAsset | 'all'; readinessCategory: 'live_provider_integration'|'empirical_validation'|'production_calibration'; status: 'blocked'|'pending'|'not_applicable'; description: string; };
export type MarketAssetCausalityCoverageReport = { generatedAt: string; launchTradableAssetCount: number; diagnosticAssetCount: number; representedReasoningAssetCount: number; assetSupportRoles: Record<MarketAssetCausalityAsset, MarketAssetSupportRole>; readiness: Readiness; representedAssets: MarketAssetCausalityAsset[]; missingAssets: MarketAssetCausalityAsset[]; duplicateAssets: MarketAssetCausalityAsset[]; gapCount: number; gaps: MarketAssetCausalityGap[]; notes: string[]; };
export type MarketAssetCausalityMatrixSnapshot = { generatedAt: string; descriptors: MarketAssetCausalityDescriptor[]; coverageReport: MarketAssetCausalityCoverageReport; };

export type MarketAssetCausalityLaunchAsset = LaunchAsset & MarketAssetCausalityAsset;
