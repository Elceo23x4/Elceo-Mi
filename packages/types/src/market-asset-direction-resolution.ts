import type { MarketReasoningModuleReadiness } from './market-reasoning-readiness';
import type { MarketEvidenceClass, TradingAssetCoverage } from './market-evidence';
import type { MarketAssetCausalityAsset, MarketAssetDriverKind, MarketAssetFamily } from './market-asset-causality';
import type { WeightedEvidenceDirection } from './market-evidence-weighting';

export const MARKET_ASSET_RAW_DIRECTION_HINTS = ['bullish','bearish','neutral','mixed','positive','negative','risk_on','risk_off','hawkish','dovish','stronger','weaker','higher','lower','unknown'] as const;
export type MarketAssetRawDirectionHint = typeof MARKET_ASSET_RAW_DIRECTION_HINTS[number];
export const MARKET_ASSET_POLICY_TONES = ['hawkish','dovish','neutral','mixed','unknown'] as const;
export type MarketAssetPolicyTone = typeof MARKET_ASSET_POLICY_TONES[number];
export const MARKET_ASSET_RISK_REGIME_HINTS = ['risk_on','risk_off','liquidity_stress','credit_stress','volatility_shock','event_window','unknown'] as const;
export type MarketAssetRiskRegimeHint = typeof MARKET_ASSET_RISK_REGIME_HINTS[number];
export const MARKET_ASSET_DRIVER_IMPACT_POLARITIES = ['asset_positive','asset_negative','base_positive','quote_positive','usd_positive','usd_negative','non_usd_positive','non_usd_negative','risk_positive','risk_negative','rates_positive','rates_negative','commodity_positive','commodity_negative','crypto_positive','crypto_negative','volatility_positive','volatility_negative','contextual','unknown'] as const;
export type MarketAssetDriverImpactPolarity = typeof MARKET_ASSET_DRIVER_IMPACT_POLARITIES[number];
export const MARKET_ASSET_RESOLVED_PRESSURE_TARGETS = ['asset_direct','base_currency','quote_currency','usd_side','non_usd_side','risk_complex','rates_complex','liquidity_complex','commodity_complex','crypto_native','volatility_complex','unknown'] as const;
export type MarketAssetResolvedPressureTarget = typeof MARKET_ASSET_RESOLVED_PRESSURE_TARGETS[number];
export const MARKET_ASSET_DIRECTION_RESOLUTION_WARNINGS = ['ambiguous_policy_issuer','missing_base_quote_context','pending_fx_relative_strength','pending_macro_surprise_normalization','requires_price_confirmation','provider_activation_gap','generic_sentiment_low_confidence','risk_regime_conflict','haven_conflict','commodity_terms_context_required'] as const;
export type MarketAssetDirectionResolutionWarning = typeof MARKET_ASSET_DIRECTION_RESOLUTION_WARNINGS[number];
export const MARKET_ASSET_DIRECTION_RESOLUTION_REASON_CODES = ['policy_tone_asset_context','risk_regime_asset_context','fx_base_quote_orientation','usd_side_policy_pressure','non_usd_side_pressure','rates_liquidity_pressure','commodity_quote_currency_pressure','china_demand_commodity_fx','crypto_native_driver','safe_haven_context','generic_sentiment_not_directional','price_confirmation_required','macro_surprise_pending','causality_map_requirement','provider_gap_visible','ambiguous_context','normalized_macro_surprise_applied','macro_surprise_incomplete','macro_inflation_pressure_context','macro_labor_pressure_context','macro_growth_pressure_context'] as const;
export type MarketAssetDirectionResolutionReasonCode = typeof MARKET_ASSET_DIRECTION_RESOLUTION_REASON_CODES[number];

export type MarketAssetDirectionResolutionDecision = WeightedEvidenceDirection;
export type MarketAssetDirectionResolutionInput = {
  asset: MarketAssetCausalityAsset | TradingAssetCoverage;
  evidenceClass: MarketEvidenceClass | string;
  metadataJson?: string | null;
  rawHint?: MarketAssetRawDirectionHint;
  driverKind?: MarketAssetDriverKind | string;
  policyTone?: MarketAssetPolicyTone;
  policyIssuerRegion?: string | null;
  affectedCurrency?: string | null;
  riskRegime?: MarketAssetRiskRegimeHint;
  observedAt?: string | null;
};
export type MarketAssetDirectionResolutionResult = {
  asset: MarketAssetCausalityAsset;
  evidenceClass: string;
  rawHint: MarketAssetRawDirectionHint;
  resolvedDirection: MarketAssetDirectionResolutionDecision;
  pressureTarget: MarketAssetResolvedPressureTarget;
  confidence: number;
  reasonCodes: MarketAssetDirectionResolutionReasonCode[];
  warnings: MarketAssetDirectionResolutionWarning[];
  requiresSurpriseNormalization: boolean;
  requiresRelativeStrength: boolean;
  requiresPriceConfirmation: boolean;
  appliedRuleIds: string[];
  rationale: string;
  unresolvedReason?: string;
};
export type MarketAssetDirectionResolutionRule = {
  ruleId: string;
  assetFamily: MarketAssetFamily | 'all';
  evidenceClasses: string[];
  rawHints: MarketAssetRawDirectionHint[];
  driverKinds: string[];
  pressureTarget: MarketAssetResolvedPressureTarget;
  requiresIssuerOrAffectedSide: boolean;
  output: MarketAssetDirectionResolutionDecision;
  confidence: number;
  reasonCodes: MarketAssetDirectionResolutionReasonCode[];
  warnings: MarketAssetDirectionResolutionWarning[];
  rationale: string;
};
export type MarketAssetDirectionResolutionCoverageReport = {
  generatedAt: string;
  launchAssetCount: number;
  representedAssets: MarketAssetCausalityAsset[];
  genericDirectionPrimaryPathDisabled: boolean;
  ruleCount: number;
  warnings: MarketAssetDirectionResolutionWarning[];
  notes: string[]; readiness: MarketReasoningModuleReadiness;
};
export type MarketAssetDirectionResolutionRuleSetSnapshot = {
  generatedAt: string;
  rules: MarketAssetDirectionResolutionRule[];
  coverageReport: MarketAssetDirectionResolutionCoverageReport;
};
