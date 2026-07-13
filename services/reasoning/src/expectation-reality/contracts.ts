import type { BiasState, CanonicalAssetSymbol, ConfidenceAnatomy, ContradictionRegime, InvalidationState, MarketMacroCurrency, MarketMacroEconomicMeaning, MarketMacroIndicatorCategory, MarketMacroIndicatorKind, MarketMacroReleaseImportance, MarketMacroRegion, MarketMacroSurpriseNormalizationResult, MarketPriceReactionResult, Timeframe } from '@elceo/types';

export type ExpectationBias = BiasState | 'mixed' | 'unsupported';
export type ExpectationHorizon = 'immediate' | 'confirmation' | 'follow_through';
export type ExpectationOutcome = 'confirmed' | 'partially_confirmed' | 'delayed_confirmation' | 'unresolved' | 'contradicted' | 'invalidated' | 'two_sided_whipsaw' | 'not_directionally_scorable' | 'insufficient_data';
export type PathClassification = 'clean_confirmation' | 'adverse_then_confirmed' | 'confirmation_then_reversal' | 'contradiction_first' | 'invalidation_first' | 'two_sided_expansion' | 'range_bound' | 'delayed_resolution' | 'insufficient_path' | 'intrabar_order_unknown';
export type DeltaSeverity = 'none' | 'minor' | 'moderate' | 'major' | 'critical';
export type FirstMaterialMoveDirection = 'expected' | 'opposite' | 'up' | 'down' | 'none';
export type EventExpectationBasis = { kind: 'numeric'; forecast: number | null; previous: number | null; unit: string | null } | { kind: 'non_numeric'; basisLabel: string; expectedState: string; unit?: string | null };
export type EventInterpretationOutcome = 'confirmed' | 'rejected' | 'absorbed' | 'delayed' | 'reversed' | 'ambiguous' | 'mispriced_candidate' | 'insufficient_data';
export type SourceProvenance = { sourceId: string; provider: string; publisher?: string | null; payloadRef?: string | null; reliability: 'verified' | 'replay' | 'fixture' | 'unverified' };

export type EventExpectationRecord = {
  expectationId: string; expectationKind: 'event'; eventReleaseId: string; eventKind: string; scheduledReleaseTime: string; issuedAt: string; dataCutoffAt: string;
  asset: CanonicalAssetSymbol; affectedAssets: CanonicalAssetSymbol[]; affectedCurrencies: string[]; indicatorKind: MarketMacroIndicatorKind | string; indicatorCategory: MarketMacroIndicatorCategory | string;
  region: MarketMacroRegion | string; currency: MarketMacroCurrency | string; importance: MarketMacroReleaseImportance; expectationBasis: EventExpectationBasis; expectedEconomicMeaning: MarketMacroEconomicMeaning | string; expectedPolicyPressure: string;
  expectedAssetDirection: ExpectationBias; preEventCognitionSnapshotId: string; preEventConfidence: number; preEventContradiction: number; expectedConfirmationConditions: string[]; provenance: SourceProvenance[]; createdAt: string;
};

export type ReleaseAlignmentState = 'aligned' | 'contradicted' | 'mixed' | 'inline' | 'insufficient_data';
export type ReleaseAlignment = { status: ReleaseAlignmentState; reasonCodes: string[]; economicMeaningAlignment: ReleaseAlignmentState; policyPressureAlignment: ReleaseAlignmentState; actualVsForecastAlignment: ReleaseAlignmentState; revisionEffect: ReleaseAlignmentState; primaryAssetDirectionAlignment: ReleaseAlignmentState; relatedMarketDirectionAlignment: ReleaseAlignmentState; expectedEconomicMeaning: string; actualEconomicMeaning: string | null; expectedPolicyPressure: string; actualPolicyPressure: string | null; expectedDirection: ExpectationBias; actualDirection: ExpectationBias | null };

export type EventRealityRecord = {
  releaseAlignment: ReleaseAlignment; releaseId: string; releaseVersion: string; observedAt: string; actual: number | null; forecast: number | null; previous: number | null; revisedPrevious: number | null; normalizedSurprise: MarketMacroSurpriseNormalizationResult | null; nonNumericOutcome?: string | null;
  provenance: SourceProvenance[]; primaryPriceReaction: MarketPriceReactionResult; followThroughReaction: MarketPriceReactionResult; relatedMarketReactions: MarketPriceReactionResult[]; actualAssetDirections: { asset: CanonicalAssetSymbol; resolvedDirection: string; confidence: number; reasonCodes: string[]; warnings: string[] }[]; observationContentHash: string; reactionProvenance: string[]; postEventCognitionSnapshotId: string | null;
  postEventConfidence: number | null; confidenceDelta: number | null; postEventContradiction: number | null; contradictionDelta: number | null; biasChange: { before: ExpectationBias; after: ExpectationBias | null; changed: boolean }; warnings: string[]; limitations: string[];
};

export type EventRealityEvaluation = { eventEvaluationId: string; expectationId: string; releaseId: string; releaseVersion: string; asset: CanonicalAssetSymbol; preEventCognitionSnapshotId: string; postEventCognitionSnapshotId: string | null; observationContentHash: string; reactionProvenance: string[]; interpretedAt: string; outcome: EventInterpretationOutcome; reasonCodes: string[]; warnings: string[]; rationale: string; expectation: EventExpectationRecord; reality: EventRealityRecord; createdAt: string };

export type ExpectationRecord = {
  expectationId: string; asset: CanonicalAssetSymbol; timeframe: Timeframe; issuedAt: string; dataCutoffAt: string;
  reasoningRunId: string; cognitionSnapshotId: string; reasoningVersion: string; scoringVersion: string;
  basePrice: number; recentRangePct: number | null; expectedBias: ExpectationBias; confidenceScore: number;
  confidenceAnatomy: ConfidenceAnatomy; contradictionScore: number; contradictionRegime: ContradictionRegime;
  invalidationState: InvalidationState; topEvidenceIds: string[]; linkedEventIds: string[]; thesis: string;
  whatWouldChangeState: string[]; horizonPolicyVersion: 'expectation-reality-v1'; createdAt: string;
};
export type ObservationProvenance = { sourceId: string; provider: string; payloadRef?: string | null; contentHash?: string | null };
export type ObservationCandle = { openedAt: string; closedAt: string; open: number; high: number; low: number; close: number; complete: boolean; verifiedPostEventSplit?: boolean };
export type ObservationSet = { asset: CanonicalAssetSymbol; timeframe: Timeframe; source: ObservationProvenance; observedWindow: { start: string; end: string }; contentHash: string; observationVersion: string; candles: ObservationCandle[] };
export type RealityMeasures = { terminalReturnPct: number | null; maximumFavourableExcursionPct: number | null; maximumAdverseExcursionPct: number | null; terminalReturnVolUnits: number | null; favourableExcursionVolUnits: number | null; adverseExcursionVolUnits: number | null; firstMaterialMoveDirection: FirstMaterialMoveDirection; firstMaterialMoveAt: string | null; confirmationReachedAt: string | null; contradictionReachedAt: string | null; invalidationBreachedAt: string | null };
export type DeltaAnatomy = { directionDelta: number; pathDelta: number; magnitudeDelta: number; timingDelta: number; invalidationDelta: number; confidenceOutcomeConsistency: number; compositeDeltaScore: number; deltaSeverity: DeltaSeverity; reasonCodes: string[]; warnings: string[]; rationale: string };
export type ExpectationRealityEvaluation = { evaluationId: string; expectationId: string; asset: CanonicalAssetSymbol; timeframe: Timeframe; horizon: ExpectationHorizon; observationVersion: string; observationContentHash: string; evaluatedAt: string; policyVersion: 'expectation-reality-v1'; outcome: ExpectationOutcome; pathClassification: PathClassification; measures: RealityMeasures; delta: DeltaAnatomy; createdAt: string };
export type NumericReleaseFields = { releaseId: string; actual: number | null; revisedPrevious: number | null; observedAt: string; releaseVersion: string; provenance: SourceProvenance[] };
