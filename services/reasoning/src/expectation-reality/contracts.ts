import type { BiasState, CanonicalAssetSymbol, ConfidenceAnatomy, ContradictionRegime, InvalidationState, Timeframe } from '@elceo/types';

export type ExpectationBias = BiasState | 'mixed' | 'unsupported';
export type ExpectationHorizon = 'immediate' | 'confirmation' | 'follow_through';
export type ExpectationOutcome = 'confirmed' | 'partially_confirmed' | 'delayed_confirmation' | 'unresolved' | 'contradicted' | 'invalidated' | 'two_sided_whipsaw' | 'not_directionally_scorable' | 'insufficient_data';
export type PathClassification = 'clean_confirmation' | 'adverse_then_confirmed' | 'confirmation_then_reversal' | 'contradiction_first' | 'invalidation_first' | 'two_sided_expansion' | 'range_bound' | 'delayed_resolution' | 'insufficient_path';
export type DeltaSeverity = 'none' | 'minor' | 'moderate' | 'major' | 'critical';
export type FirstMaterialMoveDirection = 'expected' | 'opposite' | 'up' | 'down' | 'none';

export type ExpectationRecord = {
  expectationId: string; asset: CanonicalAssetSymbol; timeframe: Timeframe; issuedAt: string; dataCutoffAt: string;
  reasoningRunId: string; cognitionSnapshotId: string; reasoningVersion: string; scoringVersion: string;
  basePrice: number; recentRangePct: number | null; expectedBias: ExpectationBias; confidenceScore: number;
  confidenceAnatomy: ConfidenceAnatomy; contradictionScore: number; contradictionRegime: ContradictionRegime;
  invalidationState: InvalidationState; topEvidenceIds: string[]; linkedEventIds: string[]; thesis: string;
  whatWouldChangeState: string[]; horizonPolicyVersion: 'expectation-reality-v1'; createdAt: string;
};

export type ObservationCandle = { openedAt: string; closedAt: string; open: number; high: number; low: number; close: number; complete: boolean };
export type ObservationSet = { observationVersion: string; candles: ObservationCandle[] };

export type RealityMeasures = {
  terminalReturnPct: number | null; maximumFavourableExcursionPct: number | null; maximumAdverseExcursionPct: number | null;
  terminalReturnVolUnits: number | null; favourableExcursionVolUnits: number | null; adverseExcursionVolUnits: number | null;
  firstMaterialMoveDirection: FirstMaterialMoveDirection; firstMaterialMoveAt: string | null; confirmationReachedAt: string | null;
  contradictionReachedAt: string | null; invalidationBreachedAt: string | null;
};

export type DeltaAnatomy = { directionDelta: number; pathDelta: number; magnitudeDelta: number; timingDelta: number; invalidationDelta: number; confidenceOutcomeConsistency: number; compositeDeltaScore: number; deltaSeverity: DeltaSeverity; reasonCodes: string[]; warnings: string[]; rationale: string };

export type ExpectationRealityEvaluation = {
  evaluationId: string; expectationId: string; asset: CanonicalAssetSymbol; timeframe: Timeframe; horizon: ExpectationHorizon; observationVersion: string;
  evaluatedAt: string; policyVersion: 'expectation-reality-v1'; outcome: ExpectationOutcome; pathClassification: PathClassification; measures: RealityMeasures; delta: DeltaAnatomy; createdAt: string;
};
