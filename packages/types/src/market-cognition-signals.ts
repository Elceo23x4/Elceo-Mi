import type { TradingAssetCoverage } from './market-evidence';
import type { EvidenceWeightHorizon } from './market-evidence-weighting';

export const MARKET_COGNITION_PRESSURE_DIRECTIONS = ['bullish', 'bearish', 'neutral', 'mixed', 'unknown'] as const;
export type MarketCognitionPressureDirection = (typeof MARKET_COGNITION_PRESSURE_DIRECTIONS)[number];

export const MARKET_COGNITION_SIGNAL_KINDS = ['macro_pressure', 'liquidity_pressure', 'risk_sentiment_pressure', 'positioning_tension', 'volatility_pressure', 'credit_stress_pressure', 'policy_pressure', 'earnings_pressure', 'geopolitical_pressure', 'freshness_warning', 'contradiction_flag', 'confidence_decomposition', 'narrative_summary'] as const;
export type MarketCognitionSignalKind = (typeof MARKET_COGNITION_SIGNAL_KINDS)[number];

export const MARKET_COGNITION_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type MarketCognitionSeverity = (typeof MARKET_COGNITION_SEVERITIES)[number];

export type MarketCognitionSignal = { signalId: string; kind: MarketCognitionSignalKind; asset: TradingAssetCoverage; horizon: EvidenceWeightHorizon; generatedAt: string; direction: MarketCognitionPressureDirection; strength: number; severity: MarketCognitionSeverity; confidence: number; evidenceItemIds: string[]; rationale: string; warnings: string[]; };
export type ConfidenceDecomposition = { generatedAt: string; asset: TradingAssetCoverage; horizon: EvidenceWeightHorizon; evidenceQualityComponent: number; evidenceWeightComponent: number; freshnessComponent: number; conflictPenalty: number; coverageComponent: number; finalConfidence: number; rationale: string; };
export type MarketContradictionFlag = { flagId: string; asset: TradingAssetCoverage; horizon: EvidenceWeightHorizon; generatedAt: string; severity: MarketCognitionSeverity; conflictingSignalKinds: MarketCognitionSignalKind[]; evidenceItemIds: string[]; rationale: string; };
export type MarketCognitionNarrativeSummary = { summaryId: string; asset: TradingAssetCoverage; horizon: EvidenceWeightHorizon; generatedAt: string; title: string; summary: string; keyDrivers: string[]; cautions: string[]; evidenceItemIds: string[]; };
export type MarketCognitionSnapshot = { snapshotId: string; generatedAt: string; asset: TradingAssetCoverage; horizon: EvidenceWeightHorizon; weightedEvidenceSnapshotId: string; signals: MarketCognitionSignal[]; confidence: ConfidenceDecomposition; contradictions: MarketContradictionFlag[]; narrative: MarketCognitionNarrativeSummary; warnings: string[]; };
export type MarketCognitionAssemblyReport = { generatedAt: string; asset: TradingAssetCoverage; horizon: EvidenceWeightHorizon; signalCount: number; contradictionCount: number; finalConfidence: number; warnings: string[]; pass: boolean; };
