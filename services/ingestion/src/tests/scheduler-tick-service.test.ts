import { buildCanonicalEventFixture } from '@elceo/schemas';
import { MemoryIngestionPersistenceRepository } from '../persistence/memory-ingestion-repository';
import { MemoryIngestionRuntimeLeaseRepository } from '../scheduler/lease-repository';
import { IngestionSchedulerTickService } from '../scheduler/scheduler-tick-service';
import type { CanonicalWorkerBoundaryService, RuntimeExecuteParams } from '../runtime/canonical-worker-boundary';
import type { IngestionRunStatus } from '../runtime/execution-mode';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

class BoundaryStub {
  constructor(private readonly statuses: IngestionRunStatus[]) {}

  async executeAssetWindow(params: RuntimeExecuteParams): Promise<{ events: ReturnType<typeof buildCanonicalEventFixture>[]; report: { runId: string; status: IngestionRunStatus } }> {
    const status = this.statuses.shift() ?? 'success';
    const runId = `run-${params.asset.replace('/', '-').replace(' ', '-')}-${params.timeframe}-${status}`;
    return { events: [buildCanonicalEventFixture({ id: `${runId}-event`, dedupeKey: `${runId}-dk` })], report: { runId, status } };
  }
}

export async function runSchedulerTickServiceTests(): Promise<void> {
  const persistence = new MemoryIngestionPersistenceRepository();
  const leaseRepo = new MemoryIngestionRuntimeLeaseRepository();

  const scheduler = new IngestionSchedulerTickService(
    new BoundaryStub(['success', 'partial_success', 'failed']) as unknown as CanonicalWorkerBoundaryService,
    persistence,
    leaseRepo,
    [
      { asset: 'XAU/USD', timeframe: 'M5', frequency: 'five_minutes', lookbackHours: 6, enabled: true, priority: 100 },
      { asset: 'BTC/USD', timeframe: 'M15', frequency: 'fifteen_minutes', lookbackHours: 12, enabled: true, priority: 99 },
      { asset: 'EUR/USD', timeframe: 'H1', frequency: 'hourly', lookbackHours: 24, enabled: true, priority: 90 }
    ]
  );

  const lockedRequestKey = 'scheduled|XAU/USD|M5|five_minutes|2026-04-22T10:05:00.000Z|canonical';
  await leaseRepo.acquireLease({
    requestKey: lockedRequestKey,
    asset: 'XAU/USD',
    timeframe: 'M5',
    mode: 'canonical',
    triggerKind: 'scheduled',
    slotStartAt: '2026-04-22T10:05:00.000Z',
    slotEndAt: '2026-04-22T10:10:00.000Z',
    leaseHolder: 'tick-locker',
    acquiredAt: '2026-04-22T10:07:00.000Z',
    expiresAt: '2026-04-22T10:09:00.000Z'
  });

  const report = await scheduler.runTick({ nowIso: '2026-04-22T10:07:00.000Z', runtimeConfig: { mode: 'canonical' } });

  assert(report.dueRunCount === 3, 'due count should include all enabled unsatisfied slots');
  assert(report.dispatchedCount === 2, 'two runs should dispatch when one is lease-locked');
  assert(report.skippedLockedCount === 1, 'locked run should be reported as skipped');
  assert(report.successCount === 1, 'success count should include successful dispatch status');
  assert(report.partialSuccessCount === 1, 'partial_success count should include partial dispatch status');
  assert(report.failedCount === 0, 'failed count should be zero when no dispatched run reports failed');

  const lockedDispatch = report.dispatches.find((item) => item.requestKey === lockedRequestKey);
  assert(Boolean(lockedDispatch && !lockedDispatch.dispatched && lockedDispatch.skippedReason === 'lease_locked'), 'locked dispatch should be explicitly reported');

  assert(report.dispatches.some((item) => item.dispatched && item.runId !== null && item.runStatus !== null), 'dispatched report should include runId/runStatus');
}
