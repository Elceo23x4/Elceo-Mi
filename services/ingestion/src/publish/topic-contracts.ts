import type { CanonicalAssetSymbol, CanonicalEvent, Timeframe } from '@elceo/types';
import type { IngestionActiveBoundary, IngestionExecutionMode, IngestionRunStatus } from '../runtime/execution-mode';
import type { IngestionTriggerKind } from '../scheduler/trigger-context';

export type IngestionPublishTopic =
  | 'ingestion.canonical.run.completed'
  | 'ingestion.canonical.events.snapshot'
  | 'ingestion.canonical.run.failed';

export type IngestionRunCompletedMessage = {
  topic: 'ingestion.canonical.run.completed';
  messageId: string;
  runId: string;
  requestKey: string;
  triggerKind: IngestionTriggerKind;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  mode: IngestionExecutionMode;
  activeBoundary: IngestionActiveBoundary;
  status: IngestionRunStatus;
  slotStartAt: string | null;
  slotEndAt: string | null;
  schedulerTickId: string | null;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  outputEventCount: number;
  canonicalEventCount: number;
  legacyEventCount: number | null;
  fallbackApplied: boolean;
  fallbackReason: string | null;
  boundaryVersion: string;
  publishedAt: string;
  source: 'elceo.ingestion';
};

export type IngestionEventSnapshotMessage = {
  topic: 'ingestion.canonical.events.snapshot';
  messageId: string;
  runId: string;
  requestKey: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  eventCount: number;
  dedupeKeys: string[];
  snapshotCreatedAt: string;
  events: CanonicalEvent[];
  source: 'elceo.ingestion';
};

export type IngestionRunFailedMessage = {
  topic: 'ingestion.canonical.run.failed';
  messageId: string;
  runId: string;
  requestKey: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  mode: IngestionExecutionMode;
  triggerKind: IngestionTriggerKind;
  status: IngestionRunStatus;
  failureReason: string;
  slotStartAt: string | null;
  slotEndAt: string | null;
  schedulerTickId: string | null;
  emittedAt: string;
  source: 'elceo.ingestion';
};

export type IngestionPublishMessage = IngestionRunCompletedMessage | IngestionEventSnapshotMessage | IngestionRunFailedMessage;
