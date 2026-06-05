import type { EvidenceWeightHorizon, WeightedEvidenceSnapshot, WeightedEvidenceItem } from './market-evidence-weighting';
import type { MarketAssetCausalityAsset, MarketAssetDriverKind } from './market-asset-causality';
import type { MarketPriceReactionResult } from './market-price-reaction';
import type { MarketEvidenceClass, TradingAssetCoverage } from './market-evidence';
import type { ReasoningEvidenceInputItem } from './reasoning-market-input';

export type MarketContradictionAsset = MarketAssetCausalityAsset;
export const MARKET_CONTRADICTION_FAMILIES = ['policy_vs_risk','macro_vs_policy','macro_vs_price_reaction','rates_vs_gold','dollar_vs_fx','fx_base_quote_conflict','risk_vs_volatility','risk_vs_credit','equities_vs_breadth','crypto_vs_derivatives','commodity_cross_asset','safe_haven_conflict','provider_staleness_conflict','source_disagreement','positioning_crowding','unknown'] as const;
export type MarketContradictionFamily = typeof MARKET_CONTRADICTION_FAMILIES[number];
export const MARKET_CONTRADICTION_SEVERITIES = ['none','low','moderate','high','critical'] as const;
export type MarketContradictionSeverity = typeof MARKET_CONTRADICTION_SEVERITIES[number];
export const MARKET_CONTRADICTION_CONFIDENCE_TIERS = ['none','low','medium','high'] as const;
export type MarketContradictionConfidenceTier = typeof MARKET_CONTRADICTION_CONFIDENCE_TIERS[number];
export const MARKET_CONTRADICTION_STATUSES = ['aligned','tension','contradiction','insufficient_data','pending_confirmation','unknown'] as const;
export type MarketContradictionStatus = typeof MARKET_CONTRADICTION_STATUSES[number];
export type MarketContradictionDriverKind = MarketAssetDriverKind | 'macro_surprise' | 'price_confirmation' | 'provider_freshness' | 'source_independence' | 'dollar_strength' | 'real_yield_pressure' | 'breadth' | 'funding' | 'unknown';
export const MARKET_CONTRADICTION_EVIDENCE_SIDES = ['supporting','opposing','mixed','context','missing'] as const;
export type MarketContradictionEvidenceSide = typeof MARKET_CONTRADICTION_EVIDENCE_SIDES[number];
export type MarketContradictionRuleId = string;
export const MARKET_CONTRADICTION_WARNINGS = ['missing_cross_asset_context','missing_price_reaction','missing_provider_reliability','stale_evidence_conflict','duplicate_source_risk','pending_confidence_calibration','pending_price_confirmation','pending_provider_reliability','partial_evidence_only','source_independence_unverified','macro_surprise_context_required','fx_relative_strength_context_required','price_reaction_confirmed','price_reaction_rejected','price_reaction_absorbed','price_reaction_reversed','price_reaction_delayed','price_reaction_ambiguous'] as const;
export type MarketContradictionWarning = typeof MARKET_CONTRADICTION_WARNINGS[number];
export const MARKET_CONTRADICTION_REASON_CODES = ['policy_risk_tension','macro_policy_tension','rates_gold_tension','dollar_fx_tension','fx_base_quote_conflict','risk_volatility_tension','credit_risk_tension','breadth_index_divergence','crypto_derivatives_tension','commodity_margin_tension','haven_cross_conflict','stale_fresh_conflict','source_disagreement_detected','price_confirmation_pending','price_reaction_confirmed','price_reaction_rejected','price_reaction_absorbed','price_reaction_reversed','price_reaction_delayed','price_reaction_ambiguous','contradiction_matrix_rule_applied'] as const;
export type MarketContradictionReasonCode = typeof MARKET_CONTRADICTION_REASON_CODES[number];

export type MarketContradictionEvidencePoint = {
  evidencePointId: string;
  asset: MarketContradictionAsset;
  horizon: EvidenceWeightHorizon;
  observedAt: string;
  evidenceClass: MarketEvidenceClass | 'diagnostic';
  driverKind: MarketContradictionDriverKind;
  side: MarketContradictionEvidenceSide;
  direction: 'bullish' | 'bearish' | 'neutral' | 'mixed' | 'unknown';
  strength: number;
  quality: number;
  providerId: string | null;
  sourceId: string | null;
  rationale: string;
  reasonCodes: MarketContradictionReasonCode[];
  warnings: MarketContradictionWarning[];
};

export type MarketContradictionInput = {
  asset: MarketContradictionAsset;
  horizon: EvidenceWeightHorizon;
  generatedAt: string;
  evidencePoints: MarketContradictionEvidencePoint[];
  priceReactionAvailable: boolean;
  priceReaction?: MarketPriceReactionResult;
  providerReliabilitySupplied: boolean;
  sourceIndependenceVerified: boolean;
  warnings: MarketContradictionWarning[];
};

export type MarketContradictionSignal = {
  signalId: string;
  ruleId: MarketContradictionRuleId;
  family: MarketContradictionFamily;
  asset: MarketContradictionAsset;
  horizon: EvidenceWeightHorizon;
  generatedAt: string;
  status: MarketContradictionStatus;
  severity: MarketContradictionSeverity;
  confidenceTier: MarketContradictionConfidenceTier;
  evidencePointIds: string[];
  warnings: MarketContradictionWarning[];
  reasonCodes: MarketContradictionReasonCode[];
  rationale: string;
};

export type MarketContradictionMatrixResult = {
  resultId: string;
  asset: MarketContradictionAsset;
  horizon: EvidenceWeightHorizon;
  generatedAt: string;
  status: MarketContradictionStatus;
  highestSeverity: MarketContradictionSeverity;
  signals: MarketContradictionSignal[];
  evidencePoints: MarketContradictionEvidencePoint[];
  warnings: MarketContradictionWarning[];
  reasonCodes: MarketContradictionReasonCode[];
  rationale: string;
  complete: false;
  pending: { confidenceCalibrationR6: true; priceReactionR7: true; providerReliabilityExpansion: true };
};

export type MarketContradictionRule = {
  ruleId: MarketContradictionRuleId;
  family: MarketContradictionFamily;
  assets: MarketContradictionAsset[];
  requiredDrivers: MarketContradictionDriverKind[];
  severity: MarketContradictionSeverity;
  status: MarketContradictionStatus;
  reasonCodes: MarketContradictionReasonCode[];
  warnings: MarketContradictionWarning[];
  rationale: string;
};

export type MarketContradictionRuleSetSnapshot = { generatedAt: string; rules: MarketContradictionRule[]; warnings: MarketContradictionWarning[]; complete: false; pending: { confidenceCalibrationR6: true; priceReactionR7: true; providerReliabilityExpansion: true } };
export type MarketContradictionCoverageReport = { generatedAt: string; familyCount: number; ruleCount: number; coveredFamilies: MarketContradictionFamily[]; missingFamilies: MarketContradictionFamily[]; warnings: MarketContradictionWarning[]; complete: false; pending: { confidenceCalibrationR6: true; priceReactionR7: true; providerReliabilityExpansion: true }; notes: string[] };

export type MarketContradictionWeightedSnapshotOptions = { priceReactionAvailable?: boolean; priceReaction?: MarketPriceReactionResult; providerReliabilitySupplied?: boolean; sourceIndependenceVerified?: boolean };
export type MarketContradictionEvidenceItemsOptions = MarketContradictionWeightedSnapshotOptions & { generatedAt?: string; horizon?: EvidenceWeightHorizon };
export type MarketContradictionWeightedSnapshotInput = WeightedEvidenceSnapshot;
export type MarketContradictionWeightedEvidenceItem = WeightedEvidenceItem;
export type MarketContradictionReasoningEvidenceItem = ReasoningEvidenceInputItem;
export type MarketContradictionTradingAsset = TradingAssetCoverage;
