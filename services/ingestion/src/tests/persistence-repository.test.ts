import { buildCanonicalEventFixture } from '@elceo/schemas';
import { MemoryIngestionEventSnapshotRepository, MemoryIngestionPersistenceRepository, MemoryIngestionRunRepository } from '../persistence/memory-ingestion-repository';
import type { IngestionRunRecordInput } from '../persistence/contracts';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function buildRunRecord(runId: string, createdAtSuffix = '00'): IngestionRunRecordInput {
  return {
    runId,
    asset: 'XAU/USD',
    timeframe: 'H1',
    mode: 'canonical',
    activeBoundary: 'canonical',
    status: 'success',
    startedAt: `2026-01-01T00:00:${createdAtSuffix}.000Z`,
    endedAt: `2026-01-01T00:00:${createdAtSuffix}.500Z`,
    durationMs: 500,
    canonicalEventCount: 1,
    legacyEventCount: null,
    outputEventCount: 1,
    fallbackApplied: false,
    fallbackReason: null,
    boundaryVersion: 'c2c.0.0',
    triggerKind: 'scheduled',
    requestKey: `scheduled|XAU/USD|H1|hourly|2026-01-01T00:00:${createdAtSuffix}.000Z|canonical`,
    slotStartAt: `2026-01-01T00:00:${createdAtSuffix}.000Z`,
    slotEndAt: `2026-01-01T01:00:${createdAtSuffix}.000Z`,
    schedulerTickId: `tick-${createdAtSuffix}`,
    comparison: null,
    diagnosticsSummary: {
      adapterFailureCount: 0,
      invalidEventCount: 0,
      mergeCount: 0,
      droppedEventCount: 0
    },
    providerCapabilities: []
  };
}

export async function runPersistenceRepositoryTests(): Promise<void> {
  const runRepo = new MemoryIngestionRunRepository();
  const eventRepo = new MemoryIngestionEventSnapshotRepository();
  const combined = new MemoryIngestionPersistenceRepository(runRepo, eventRepo);

  const event = buildCanonicalEventFixture({ id: 'evt-1', dedupeKey: 'dk-1', relatedAssets: ['XAU/USD'], relatedTimeframes: ['H1'] });
  const run = buildRunRecord('run-1', '01');

  await combined.persistRunWithEvents(run, [event]);

  const byId = await runRepo.getRunById('run-1');
  assert(Boolean(byId), 'save/get run by id');

  const latest = await runRepo.getLatestRunForAssetTimeframe('XAU/USD', 'H1');
  assert(latest?.runId === 'run-1', 'latest run by asset/timeframe');

  const eventsByRun = await eventRepo.getEventsByRunId('run-1');
  assert(eventsByRun.length === 1 && eventsByRun[0]?.id === 'evt-1', 'save/get event snapshots');

  const latestEvents = await eventRepo.getLatestEventsForAssetTimeframe('XAU/USD', 'H1');
  assert(latestEvents.length === 1, 'latest events by asset/timeframe');

  await runRepo.saveRunRecord({ ...run, status: 'partial_success' });
  const overwritten = await runRepo.getRunById('run-1');
  assert(overwritten?.status === 'partial_success', 'idempotent run persistence overwrites by runId deterministically');

  await combined.persistRunWithEvents(buildRunRecord('run-2', '02'), [buildCanonicalEventFixture({ id: 'evt-2', dedupeKey: 'dk-2' })]);
  const recent = await runRepo.listRecentRuns({ limit: 10, asset: 'XAU/USD', timeframe: 'H1' });
  assert(recent[0]?.runId === 'run-2' && recent[1]?.runId === 'run-1', 'recent runs deterministic order');
}
