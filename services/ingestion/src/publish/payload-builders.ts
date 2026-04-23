import type { CanonicalEvent } from '@elceo/types';
import type { PersistedIngestionRun } from '../persistence/contracts';
import type { PersistedOutboxItem } from './outbox-contracts';
import { buildEventSnapshotOutboxDedupeKey, buildRunCompletedOutboxDedupeKey, buildRunFailedOutboxDedupeKey } from './outbox-dedupe';
import type { IngestionEventSnapshotMessage, IngestionRunCompletedMessage, IngestionRunFailedMessage } from './topic-contracts';

function buildMessageId(prefix: string, runId: string, nowIso: string): string {
  return `${prefix}|${runId}|${nowIso}`;
}

function createOutboxBase(params: {
  outboxId: string;
  run: PersistedIngestionRun;
  itemKind: PersistedOutboxItem['itemKind'];
  topic: PersistedOutboxItem['topic'];
  dedupeKey: string;
  payloadJson: string;
  nowIso: string;
}): PersistedOutboxItem {
  return {
    outboxId: params.outboxId,
    runId: params.run.runId,
    requestKey: params.run.requestKey,
    itemKind: params.itemKind,
    topic: params.topic,
    asset: params.run.asset,
    timeframe: params.run.timeframe,
    triggerKind: params.run.triggerKind,
    slotStartAt: params.run.slotStartAt,
    slotEndAt: params.run.slotEndAt,
    schedulerTickId: params.run.schedulerTickId,
    dedupeKey: params.dedupeKey,
    payloadJson: params.payloadJson,
    status: 'pending',
    attemptCount: 0,
    lastAttemptAt: null,
    publishedAt: null,
    lastErrorCode: null,
    lastErrorMessage: null,
    availableAt: params.nowIso,
    createdAt: params.nowIso,
    updatedAt: params.nowIso
  };
}

function buildOutboxId(dedupeKey: string): string {
  return `outbox|${dedupeKey}`;
}

export function buildRunCompletedOutboxItem(run: PersistedIngestionRun, nowIso: string): PersistedOutboxItem {
  const payload: IngestionRunCompletedMessage = {
    topic: 'ingestion.canonical.run.completed',
    messageId: buildMessageId('run_completed', run.runId, nowIso),
    runId: run.runId,
    requestKey: run.requestKey,
    triggerKind: run.triggerKind,
    asset: run.asset,
    timeframe: run.timeframe,
    mode: run.mode,
    activeBoundary: run.activeBoundary,
    status: run.status,
    slotStartAt: run.slotStartAt,
    slotEndAt: run.slotEndAt,
    schedulerTickId: run.schedulerTickId,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
    durationMs: run.durationMs,
    outputEventCount: run.outputEventCount,
    canonicalEventCount: run.canonicalEventCount,
    legacyEventCount: run.legacyEventCount,
    fallbackApplied: run.fallbackApplied,
    fallbackReason: run.fallbackReason,
    boundaryVersion: run.boundaryVersion,
    publishedAt: nowIso,
    source: 'elceo.ingestion'
  };

  const dedupeKey = buildRunCompletedOutboxDedupeKey(run.runId);
  return createOutboxBase({
    outboxId: buildOutboxId(dedupeKey),
    run,
    itemKind: 'run_completed',
    topic: 'ingestion.canonical.run.completed',
    dedupeKey,
    payloadJson: JSON.stringify(payload),
    nowIso
  });
}

export function buildRunFailedOutboxItem(run: PersistedIngestionRun, nowIso: string, failureReason: string): PersistedOutboxItem {
  const payload: IngestionRunFailedMessage = {
    topic: 'ingestion.canonical.run.failed',
    messageId: buildMessageId('run_failed', run.runId, nowIso),
    runId: run.runId,
    requestKey: run.requestKey,
    asset: run.asset,
    timeframe: run.timeframe,
    mode: run.mode,
    triggerKind: run.triggerKind,
    status: run.status,
    failureReason,
    slotStartAt: run.slotStartAt,
    slotEndAt: run.slotEndAt,
    schedulerTickId: run.schedulerTickId,
    emittedAt: nowIso,
    source: 'elceo.ingestion'
  };

  const dedupeKey = buildRunFailedOutboxDedupeKey(run.runId);
  return createOutboxBase({
    outboxId: buildOutboxId(dedupeKey),
    run,
    itemKind: 'run_failed',
    topic: 'ingestion.canonical.run.failed',
    dedupeKey,
    payloadJson: JSON.stringify(payload),
    nowIso
  });
}

export function buildEventSnapshotOutboxItem(run: PersistedIngestionRun, events: CanonicalEvent[], nowIso: string): PersistedOutboxItem {
  const payload: IngestionEventSnapshotMessage = {
    topic: 'ingestion.canonical.events.snapshot',
    messageId: buildMessageId('event_snapshot', run.runId, nowIso),
    runId: run.runId,
    requestKey: run.requestKey,
    asset: run.asset,
    timeframe: run.timeframe,
    eventCount: events.length,
    dedupeKeys: events.map((event) => event.dedupeKey),
    snapshotCreatedAt: nowIso,
    events,
    source: 'elceo.ingestion'
  };

  const dedupeKey = buildEventSnapshotOutboxDedupeKey(run.runId, run.asset, run.timeframe);
  return createOutboxBase({
    outboxId: buildOutboxId(dedupeKey),
    run,
    itemKind: 'event_snapshot',
    topic: 'ingestion.canonical.events.snapshot',
    dedupeKey,
    payloadJson: JSON.stringify(payload),
    nowIso
  });
}
