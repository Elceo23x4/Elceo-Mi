import type { BiasState, CanonicalAssetSymbol, CanonicalCognitionState, Timeframe } from '@elceo/types';

export type CognitionDriftSeverity = 'none' | 'minor' | 'moderate' | 'major' | 'critical';

export type BiasDelta = {
  previousBias: BiasState;
  currentBias: BiasState;
  changed: boolean;
  flip: boolean;
};

export type NumericDelta = {
  previous: number;
  current: number;
  absoluteDelta: number;
  direction: 'up' | 'down' | 'flat';
};

export type EvidenceDelta = {
  previousTopEvidenceIds: string[];
  currentTopEvidenceIds: string[];
  enteredEvidenceIds: string[];
  exitedEvidenceIds: string[];
  retainedEvidenceIds: string[];
  rerankedEvidenceIds: string[];
  previousTopCount: number;
  currentTopCount: number;
};

export type InvalidationDelta = {
  previousPrimaryPrice: number | null;
  currentPrimaryPrice: number | null;
  priceChanged: boolean;
  absolutePriceDelta: number;
  previousRiskLabel: CanonicalCognitionState['invalidation']['riskLabel'] | null;
  currentRiskLabel: CanonicalCognitionState['invalidation']['riskLabel'] | null;
  riskLabelChanged: boolean;
};

export type ChartProjectionDelta = {
  previousAnnotationIds: string[];
  currentAnnotationIds: string[];
  enteredAnnotationIds: string[];
  exitedAnnotationIds: string[];
  previousEmphasisLevels: number[];
  currentEmphasisLevels: number[];
  emphasisLevelChanged: boolean;
  contradictionMarkerVisibilityChanged: boolean;
};

export type CognitionDriftReport = {
  driftId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  previousSnapshotId: string;
  currentSnapshotId: string;
  previousReasoningRunId: string;
  currentReasoningRunId: string;
  comparedAt: string;
  biasDelta: BiasDelta;
  confidenceDelta: NumericDelta;
  contradictionDelta: NumericDelta;
  freshnessDelta: NumericDelta;
  invalidationDelta: InvalidationDelta;
  evidenceDelta: EvidenceDelta;
  chartProjectionDelta: ChartProjectionDelta;
  severity: CognitionDriftSeverity;
  summary: string;
  keyChanges: string[];
  createdAt: string;
};
