import type { WeightedEvidenceSnapshot } from './market-evidence-weighting';
import type { ReasoningEvidenceInputItem } from './reasoning-market-input';

export const MARKET_FX_CURRENCY_CODES = ['USD','EUR','GBP','JPY','CHF','AUD','NZD','CAD'] as const;
export type MarketFxCurrencyCode = typeof MARKET_FX_CURRENCY_CODES[number];

export const MARKET_FX_PAIR_ASSETS = ['eur_usd','gbp_usd','usd_jpy','usd_chf','aud_usd','nzd_usd','usd_cad'] as const;
export type MarketFxPairAsset = typeof MARKET_FX_PAIR_ASSETS[number];

export const MARKET_FX_DIAGNOSTIC_ASSETS = ['dxy'] as const;
export type MarketFxDiagnosticAsset = typeof MARKET_FX_DIAGNOSTIC_ASSETS[number];

export const MARKET_FX_CURRENCY_PRESSURE_COMPONENT_KINDS = ['central_bank_policy','policy_rate_expectations','yield_differential','real_yield_pressure','inflation_surprise_pending','growth_surprise_pending','labor_market_surprise_pending','risk_regime','safe_haven_demand','dollar_liquidity','funding_stress','intervention_risk','fiscal_risk','commodity_terms','oil_energy','china_global_demand','credit_stress','positioning_cot','market_price_confirmation_pending','provider_activation_gap','normalized_inflation_pressure','normalized_growth_pressure','normalized_labor_pressure','normalized_policy_pressure'] as const;
export type MarketFxCurrencyPressureComponentKind = typeof MARKET_FX_CURRENCY_PRESSURE_COMPONENT_KINDS[number];

export const MARKET_FX_CURRENCY_PRESSURE_DIRECTIONS = ['strengthening','weakening','neutral','mixed','unknown'] as const;
export type MarketFxCurrencyPressureDirection = typeof MARKET_FX_CURRENCY_PRESSURE_DIRECTIONS[number];

export const MARKET_FX_CURRENCY_PRESSURE_SOURCES = ['metadata','direction_resolver','weighted_evidence','causality_map','rule','diagnostic'] as const;
export type MarketFxCurrencyPressureSource = typeof MARKET_FX_CURRENCY_PRESSURE_SOURCES[number];

export const MARKET_FX_RELATIVE_PAIR_DIRECTIONS = ['base_strengthening','quote_strengthening','neutral','mixed','unknown'] as const;
export type MarketFxRelativePairDirection = typeof MARKET_FX_RELATIVE_PAIR_DIRECTIONS[number];

export const MARKET_FX_RELATIVE_STRENGTH_CONFIDENCE_TIERS = ['low','medium','high'] as const;
export type MarketFxRelativeStrengthConfidenceTier = typeof MARKET_FX_RELATIVE_STRENGTH_CONFIDENCE_TIERS[number];

export const MARKET_FX_RELATIVE_STRENGTH_WARNINGS = ['missing_base_pressure','missing_quote_pressure','pending_macro_surprise_normalization','requires_price_confirmation','provider_activation_gap','limited_dxy_diagnostic','haven_conflict','risk_regime_conflict','intervention_risk','commodity_context_missing','relative_magnitude_missing','weighted_snapshot_metadata_limited'] as const;
export type MarketFxRelativeStrengthWarning = typeof MARKET_FX_RELATIVE_STRENGTH_WARNINGS[number];

export const MARKET_FX_RELATIVE_STRENGTH_REASON_CODES = ['fx_base_quote_orientation','base_currency_pressure','quote_currency_pressure','central_bank_policy_side_mapped','non_usd_issuer_side_mapped','usd_side_policy_pressure','risk_regime_asset_context','safe_haven_context','funding_stress_context','commodity_quote_currency_pressure','china_demand_commodity_fx','fiscal_risk_pressure','intervention_risk_caveat','missing_side_evidence_penalty','macro_surprise_pending','price_confirmation_required','provider_gap_visible','relative_strength_applied','dxy_limited_diagnostic','mixed_base_quote_conflict','normalized_macro_surprise_applied'] as const;
export type MarketFxRelativeStrengthReasonCode = typeof MARKET_FX_RELATIVE_STRENGTH_REASON_CODES[number];

export type MarketFxCurrencyPressureComponent = {
  componentId: string;
  currency: MarketFxCurrencyCode;
  kind: MarketFxCurrencyPressureComponentKind;
  direction: MarketFxCurrencyPressureDirection;
  score: number;
  confidence: number;
  source: MarketFxCurrencyPressureSource;
  evidenceIds: string[];
  reasonCodes: MarketFxRelativeStrengthReasonCode[];
  warnings: MarketFxRelativeStrengthWarning[];
  rationale: string;
};

export type MarketFxCurrencyPressureSnapshot = {
  currency: MarketFxCurrencyCode;
  pressureScore: number;
  pressureDirection: MarketFxCurrencyPressureDirection;
  componentCount: number;
  representedKinds: MarketFxCurrencyPressureComponentKind[];
  components: MarketFxCurrencyPressureComponent[];
  warnings: MarketFxRelativeStrengthWarning[];
  rationale: string;
};

export type MarketFxRelativeStrengthInput = {
  pairAsset: MarketFxPairAsset | 'dxy';
  evidenceItems?: ReasoningEvidenceInputItem[];
  weightedSnapshot?: WeightedEvidenceSnapshot;
  metadataJson?: string | null;
  asOfIso?: string;
};

export type MarketFxRelativeStrengthResult = {
  pairAsset: MarketFxPairAsset | 'dxy';
  baseCurrency: MarketFxCurrencyCode;
  quoteCurrency: MarketFxCurrencyCode;
  basePressure: MarketFxCurrencyPressureSnapshot;
  quotePressure: MarketFxCurrencyPressureSnapshot;
  netPressureScore: number;
  pairDirection: MarketFxRelativePairDirection;
  confidence: number;
  confidenceTier: MarketFxRelativeStrengthConfidenceTier;
  components: MarketFxCurrencyPressureComponent[];
  reasonCodes: MarketFxRelativeStrengthReasonCode[];
  warnings: MarketFxRelativeStrengthWarning[];
  appliedRuleIds: string[];
  requiresMacroSurpriseNormalization: boolean;
  requiresPriceConfirmation: boolean;
  providerCoverageStatus: 'fixture_only' | 'partial' | 'pending_provider_activation' | 'diagnostic_limited';
  rationale: string;
};

export type MarketFxRelativeStrengthCoverageReport = {
  generatedAt: string;
  representedPairAssets: MarketFxPairAsset[];
  optionalDiagnostics: Array<'dxy'>;
  pairCount: number;
  currencies: MarketFxCurrencyCode[];
  dxyCoverage: 'limited_diagnostic' | 'not_enabled';
  pendingPhases: Array<'R4'|'R5'|'R6'|'R7'|'provider_reliability'>;
  warnings: MarketFxRelativeStrengthWarning[];
  notes: string[];
};

export type MarketFxRelativeStrengthRule = {
  ruleId: string;
  pairAssets: Array<MarketFxPairAsset | 'dxy'>;
  componentKind: MarketFxCurrencyPressureComponentKind;
  sourceCurrency: MarketFxCurrencyCode | 'pair_specific' | 'usd_basket';
  affectedSide: 'base' | 'quote' | 'both' | 'diagnostic';
  directionWhenPositive: MarketFxCurrencyPressureDirection;
  confidence: number;
  warnings: MarketFxRelativeStrengthWarning[];
  reasonCodes: MarketFxRelativeStrengthReasonCode[];
  rationale: string;
};

export type MarketFxRelativeStrengthRuleSetSnapshot = {
  generatedAt: string;
  threshold: number;
  rules: MarketFxRelativeStrengthRule[];
  coverageReport: MarketFxRelativeStrengthCoverageReport;
};
