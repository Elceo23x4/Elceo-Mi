import { buildCanonicalEventFixture } from '@elceo/schemas';
import { MemoryIngestionPersistenceRepository } from '../persistence/memory-ingestion-repository';
import { ReplayPublicationService } from '../publish/replay-publish';
import { IngestionPublicationStagingService } from '../publish/staging-service';
import { MemoryOutboxRepository } from '../publish/outbox-repository';
import type { IngestionRunRecordInput } from '../persistence/contracts';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function runRecord(runId: string): IngestionRunRecordInput {
  return {
    runId,
    asset: 'EUR/USD',
    timeframe: 'H1',
    mode: 'canonical',
    activeBoundary: 'canonical',
    status: 'success',
    startedAt: '2026-04-22T10:00:00.000Z',
    endedAt: '2026-04-22T10:00:10.000Z',
    durationMs: 10_000,
    canonicalEventCount: 1,
    legacyEventCount: null,
    outputEventCount: 1,
    fallbackApplied: false,
    fallbackReason: null,
    boundaryVersion: 'c2c.0.0',
    triggerKind: 'scheduled',
    requestKey: `scheduled|EUR/USD|H1|hourly|2026-04-22T10:00:00.000Z|canonical`,
    slotStartAt: '2026-04-22T10:00:00.000Z',
    slotEndAt: '2026-04-22T11:00:00.000Z',
    schedulerTickId: 'tick-1',
    comparison: null,
    diagnosticsSummary: { adapterFailureCount: 0, invalidEventCount: 0, mergeCount: 0, droppedEventCount: 0 },
    providerCapabilities: []
  };
}

export async function runReplayPublishTests(): Promise<void> {
  const persistence = new MemoryIngestionPersistenceRepository();
  const outbox = new MemoryOutboxRepository();
  const staging = new IngestionPublicationStagingService(outbox);
  const replay = new ReplayPublicationService(persistence, staging);

  await persistence.persistRunWithEvents(runRecord('run-r1'), [buildCanonicalEventFixture({ id: 'evt-r1', dedupeKey: 'dk-r1', relatedAssets: ['EUR/USD'], relatedTimeframes: ['H1'] })]);

  const stagedByRunId = await replay.stagePublicationsForRunId('run-r1', '2026-04-22T10:05:00.000Z');
  assert(stagedByRunId.length === 2, 'replay stage by runId should stage completed + snapshot');

  const stagedByLatest = await replay.stagePublicationsForLatestAssetTimeframe('EUR/USD', 'H1', '2026-04-22T10:06:00.000Z');
  assert(stagedByLatest.length === 2, 'replay stage by latest asset/timeframe should return staged item descriptors');

  const stagedByRequestKey = await replay.stagePublicationsForRequestKey('scheduled|EUR/USD|H1|hourly|2026-04-22T10:00:00.000Z|canonical', '2026-04-22T10:06:30.000Z');
  assert(stagedByRequestKey.length === 2, 'replay stage by requestKey should load persisted run and stage publications');

  const stagedBySlot = await replay.stagePublicationsForSlot('EUR/USD', 'H1', '2026-04-22T10:00:00.000Z', '2026-04-22T10:06:45.000Z');
  assert(stagedBySlot.length === 2, 'replay stage by slot should load scheduled slot run and stage publications');

  const due = await outbox.listDueOutboxItems(10, '2026-04-22T10:07:00.000Z');
  const completed = due.filter((item) => item.itemKind === 'run_completed');
  assert(completed.length === 1, 'duplicate replay staging should remain idempotent by dedupe key');
}
