import type { CanonicalAssetSymbol, CanonicalEvent, EventImpactLevel, EvidenceKind, SourceCategory, Timeframe } from '@elceo/types';
import type { ProviderCapabilityDiagnostic } from '../facade/provider-capabilities';
import type { IngestionActiveBoundary, IngestionExecutionMode, IngestionRunStatus } from '../runtime/execution-mode';
import type { IngestionRunComparison } from '../runtime/run-report';
import type { IngestionTriggerKind } from '../scheduler/trigger-context';

export type PersistedIngestionRun = {
  runId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  mode: IngestionExecutionMode;
  activeBoundary: IngestionActiveBoundary;
  status: IngestionRunStatus;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  canonicalEventCount: number;
  legacyEventCount: number | null;
  outputEventCount: number;
  fallbackApplied: boolean;
  fallbackReason: string | null;
  boundaryVersion: string;
  triggerKind: IngestionTriggerKind;
  requestKey: string;
  slotStartAt: string | null;
  slotEndAt: string | null;
  schedulerTickId: string | null;
  overlapRatio: number | null;
  comparisonJson: string | null;
  diagnosticsSummaryJson: string;
  providerCapabilitiesJson: string;
  createdAt: string;
};

export type PersistedEventSnapshotRecord = {
  runId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  eventId: string;
  dedupeKey: string;
  relevanceScore: number;
  impact: EventImpactLevel;
  sourceCategory: SourceCategory;
  sourceName: string;
  eventKind: EvidenceKind;
  occurredAt: string;
  detectedAt: string;
  stale: boolean;
  canonicalEventJson: string;
  createdAt: string;
};

export type IngestionDiagnosticsSummary = {
  adapterFailureCount: number;
  invalidEventCount: number;
  mergeCount: number;
  droppedEventCount: number;
};

export type IngestionRunRecordInput = {
  runId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  mode: IngestionExecutionMode;
  activeBoundary: IngestionActiveBoundary;
  status: IngestionRunStatus;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  canonicalEventCount: number;
  legacyEventCount: number | null;
  outputEventCount: number;
  fallbackApplied: boolean;
  fallbackReason: string | null;
  boundaryVersion: string;
  triggerKind: IngestionTriggerKind;
  requestKey: string;
  slotStartAt: string | null;
  slotEndAt: string | null;
  schedulerTickId: string | null;
  comparison: IngestionRunComparison | null;
  diagnosticsSummary: IngestionDiagnosticsSummary;
  providerCapabilities: ProviderCapabilityDiagnostic[];
};

export type IngestionRunRepository = {
  saveRunRecord(record: IngestionRunRecordInput): Promise<void>;
  getRunById(runId: string): Promise<PersistedIngestionRun | null>;
  getLatestRunForAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<PersistedIngestionRun | null>;
  listRecentRuns(params: { limit: number; asset?: CanonicalAssetSymbol; timeframe?: Timeframe; triggerKind?: IngestionTriggerKind; slotStartAt?: string }): Promise<PersistedIngestionRun[]>;
};

export type IngestionEventSnapshotRepository = {
  saveEventSnapshots(runId: string, asset: CanonicalAssetSymbol, timeframe: Timeframe, events: CanonicalEvent[]): Promise<void>;
  getEventsByRunId(runId: string): Promise<CanonicalEvent[]>;
  getLatestEventsForAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<CanonicalEvent[]>;
  deleteSnapshotsForRun(runId: string): Promise<void>;
};

export type IngestionPersistenceRepository = {
  runRepository: IngestionRunRepository;
  eventSnapshotRepository: IngestionEventSnapshotRepository;
  persistRunWithEvents(record: IngestionRunRecordInput, events: CanonicalEvent[]): Promise<void>;
  loadReplayBundleByRunId(runId: string): Promise<{ run: PersistedIngestionRun; events: CanonicalEvent[] } | null>;
};
