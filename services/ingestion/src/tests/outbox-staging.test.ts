import { buildCanonicalEventFixture } from '@elceo/schemas';
import { IngestionPublicationStagingService } from '../publish/staging-service';
import { MemoryOutboxRepository } from '../publish/outbox-repository';
import type { PersistedIngestionRun } from '../persistence/contracts';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function runFixture(status: PersistedIngestionRun['status'], outputEventCount: number): PersistedIngestionRun {
  return {
    runId: `run-${status}`,
    asset: 'XAU/USD',
    timeframe: 'H1',
    mode: 'canonical',
    activeBoundary: status === 'failed' ? 'none' : 'canonical',
    status,
    startedAt: '2026-04-22T10:00:00.000Z',
    endedAt: '2026-04-22T10:00:10.000Z',
    durationMs: 10_000,
    canonicalEventCount: outputEventCount,
    legacyEventCount: null,
    outputEventCount,
    fallbackApplied: false,
    fallbackReason: status === 'failed' ? 'canonical_failure_without_fallback' : null,
    boundaryVersion: 'c2c.0.0',
    triggerKind: 'scheduled',
    requestKey: `scheduled|XAU/USD|H1|hourly|2026-04-22T10:00:00.000Z|canonical`,
    slotStartAt: '2026-04-22T10:00:00.000Z',
    slotEndAt: '2026-04-22T11:00:00.000Z',
    schedulerTickId: 'tick-1',
    overlapRatio: null,
    comparisonJson: null,
    diagnosticsSummaryJson: '{}',
    providerCapabilitiesJson: '[]',
    createdAt: '2026-04-22T10:00:10.000Z'
  };
}

export async function runOutboxStagingTests(): Promise<void> {
  const repo = new MemoryOutboxRepository();
  const service = new IngestionPublicationStagingService(repo);

  const successRun = runFixture('success', 1);
  const staged = await service.stageRunPublications(successRun, [buildCanonicalEventFixture({ id: 'evt-1', dedupeKey: 'dk-1' })], '2026-04-22T10:01:00.000Z');
  assert(staged.length === 2, 'successful run with events should stage run_completed and event_snapshot');

  const failedRun = runFixture('failed', 0);
  const failedStaged = await service.stageRunPublications(failedRun, [], '2026-04-22T10:02:00.000Z');
  assert(failedStaged.length === 1 && failedStaged[0]?.itemKind === 'run_failed', 'failed run should stage run_failed only');

  await service.stageRunPublications(successRun, [buildCanonicalEventFixture({ id: 'evt-1', dedupeKey: 'dk-1' })], '2026-04-22T10:03:00.000Z');
  const due = await repo.listDueOutboxItems(20, '2026-04-22T11:00:00.000Z');
  const runCompletedDuplicates = due.filter((item) => item.dedupeKey === 'run_completed|run-success');
  assert(runCompletedDuplicates.length === 1, 'repeated staging should remain idempotent by dedupeKey');
}
