import type { BiasState, CanonicalAssetSymbol, Timeframe } from '@elceo/types';

export type PersistedReasoningRun = {
  reasoningRunId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  sourceIngestionRunId: string | null;
  sourceIngestionRequestKey: string | null;
  engineName: string;
  reasoningVersion: string;
  scoringVersion: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  status: 'success' | 'partial_success' | 'failed';
  inputEventCount: number;
  inputZoneCount: number;
  projectedEvidenceCount: number;
  priorSnapshotId: string | null;
  snapshotId: string | null;
  failureReason: string | null;
  warningsJson: string;
  createdAt: string;
};

export type PersistedCognitionSnapshot = {
  snapshotId: string;
  reasoningRunId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  evaluatedAt: string;
  bias: BiasState;
  confidenceScore: number;
  contradictionScore: number;
  freshnessScore: number;
  sourceIngestionRunId: string | null;
  sourceIngestionRequestKey: string | null;
  reasoningVersion: string;
  scoringVersion: string;
  cognitionJson: string;
  createdAt: string;
};

export type ReasoningRunRepository = {
  saveReasoningRun(record: PersistedReasoningRun): Promise<void>;
  getReasoningRunById(reasoningRunId: string): Promise<PersistedReasoningRun | null>;
  getLatestReasoningRunForAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<PersistedReasoningRun | null>;
  listRecentReasoningRuns(params: { limit: number; asset?: CanonicalAssetSymbol; timeframe?: Timeframe; status?: PersistedReasoningRun['status'] }): Promise<PersistedReasoningRun[]>;
};

export type CognitionSnapshotRepository = {
  saveCognitionSnapshot(record: PersistedCognitionSnapshot): Promise<void>;
  getSnapshotById(snapshotId: string): Promise<PersistedCognitionSnapshot | null>;
  getSnapshotByReasoningRunId(reasoningRunId: string): Promise<PersistedCognitionSnapshot | null>;
  getLatestSnapshotForAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe, beforeIso?: string): Promise<PersistedCognitionSnapshot | null>;
};

export type ReasoningPersistenceRepository = {
  runRepository: ReasoningRunRepository;
  snapshotRepository: CognitionSnapshotRepository;
  driftRepository: CognitionDriftRepository;
  expectationRepository: ExpectationRepository;
  expectationRealityRepository: ExpectationRealityRepository;
  eventExpectationRepository: EventExpectationRepository;
  eventRealityRepository: EventRealityRepository;
};

export type PersistedCognitionDriftRecord = {
  driftId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  previousSnapshotId: string;
  currentSnapshotId: string;
  previousReasoningRunId: string;
  currentReasoningRunId: string;
  comparedAt: string;
  severity: 'none' | 'minor' | 'moderate' | 'major' | 'critical';
  summary: string;
  keyChangesJson: string;
  confidenceDelta: number;
  contradictionDelta: number;
  freshnessDelta: number;
  invalidationPriceDelta: number;
  createdAt: string;
  driftJson: string;
};

export type CognitionDriftRepository = {
  saveDriftRecord(record: PersistedCognitionDriftRecord): Promise<void>;
  getDriftById(driftId: string): Promise<PersistedCognitionDriftRecord | null>;
  getLatestDriftForAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<PersistedCognitionDriftRecord | null>;
  listRecentDrifts(params: {
    limit: number;
    asset?: CanonicalAssetSymbol;
    timeframe?: Timeframe;
    severity?: PersistedCognitionDriftRecord['severity'];
  }): Promise<PersistedCognitionDriftRecord[]>;
};

import type { EventExpectationRepository, EventRealityRepository, ExpectationRealityRepository, ExpectationRepository } from '../expectation-reality/repository';

export type ExpectationRealityPersistence = {
  expectationRepository: ExpectationRepository;
  expectationRealityRepository: ExpectationRealityRepository;
  eventExpectationRepository: EventExpectationRepository;
  eventRealityRepository: EventRealityRepository;
};
