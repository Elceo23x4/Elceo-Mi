import { buildCanonicalEventFixture } from '@elceo/schemas';
import { MemoryIngestionPersistenceRepository } from '../persistence/memory-ingestion-repository';
import { getLatestReplayBundleForAssetTimeframe, getReplayBundleByRunId } from '../persistence/replay';
import type { IngestionEventSnapshotRepository, IngestionRunRecordInput, IngestionRunRepository } from '../persistence/contracts';

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
    startedAt: '2026-01-01T00:00:00.000Z',
    endedAt: '2026-01-01T00:00:01.000Z',
    durationMs: 1000,
    canonicalEventCount: 1,
    legacyEventCount: null,
    outputEventCount: 1,
    fallbackApplied: false,
    fallbackReason: null,
    boundaryVersion: 'c2c.0.0',
    triggerKind: 'scheduled',
    requestKey: `scheduled|EUR/USD|H1|hourly|2026-01-01T00:00:00.000Z|canonical`,
    slotStartAt: '2026-01-01T00:00:00.000Z',
    slotEndAt: '2026-01-01T01:00:00.000Z',
    schedulerTickId: 'tick-replay',
    comparison: null,
    diagnosticsSummary: { adapterFailureCount: 0, invalidEventCount: 0, mergeCount: 0, droppedEventCount: 0 },
    providerCapabilities: []
  };
}

class CorruptSnapshotRepository implements IngestionEventSnapshotRepository {
  async saveEventSnapshots(): Promise<void> {}
  async getEventsByRunId(): Promise<never> {
    throw new Error('Invalid persisted CanonicalEvent: malformed');
  }
  async getLatestEventsForAssetTimeframe(): Promise<never> {
    throw new Error('Invalid persisted CanonicalEvent: malformed');
  }
  async deleteSnapshotsForRun(): Promise<void> {}
}

export async function runReplayQueryTests(): Promise<void> {
  const repo = new MemoryIngestionPersistenceRepository();
  await repo.persistRunWithEvents(runRecord('run-r1'), [buildCanonicalEventFixture({ id: 'evt-r1', dedupeKey: 'dk-r1', relatedAssets: ['EUR/USD'], relatedTimeframes: ['H1'] })]);

  const bundle = await getReplayBundleByRunId('run-r1', repo.runRepository, repo.eventSnapshotRepository);
  assert(bundle?.run.runId === 'run-r1', 'replay bundle by runId returns run');
  assert(bundle?.events.length === 1, 'replay bundle by runId returns events');

  const latestBundle = await getLatestReplayBundleForAssetTimeframe('EUR/USD', 'H1', repo.runRepository, repo.eventSnapshotRepository);
  assert(latestBundle?.run.runId === 'run-r1', 'latest replay bundle returns latest run');

  let corruptedThrown = false;
  try {
    await getReplayBundleByRunId('run-r1', repo.runRepository as IngestionRunRepository, new CorruptSnapshotRepository());
  } catch {
    corruptedThrown = true;
  }
  assert(corruptedThrown, 'malformed serialized event should trigger deterministic replay error');

  await repo.runRepository.saveRunRecord(runRecord('run-empty'));
  const emptyBundle = await getReplayBundleByRunId('run-empty', repo.runRepository, repo.eventSnapshotRepository);
  assert(Boolean(emptyBundle), 'run without snapshots should still return replay run bundle');
  assert((emptyBundle?.events.length ?? -1) === 0, 'run without snapshots returns empty events per policy');
}
