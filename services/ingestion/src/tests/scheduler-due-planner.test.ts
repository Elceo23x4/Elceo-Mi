import { MemoryIngestionRunRepository } from '../persistence/memory-ingestion-repository';
import { planDueRuns } from '../scheduler/due-planner';
import type { IngestionSchedulePlanItem } from '../scheduler/schedule-plan';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export async function runSchedulerDuePlannerTests(): Promise<void> {
  const runRepo = new MemoryIngestionRunRepository();
  const plan: IngestionSchedulePlanItem[] = [
    { asset: 'XAU/USD', timeframe: 'M5', frequency: 'five_minutes', lookbackHours: 6, enabled: true, priority: 100 },
    { asset: 'BTC/USD', timeframe: 'M15', frequency: 'fifteen_minutes', lookbackHours: 12, enabled: true, priority: 100 },
    { asset: 'EUR/USD', timeframe: 'H1', frequency: 'hourly', lookbackHours: 24, enabled: true, priority: 90 }
  ];

  const nowIso = '2026-04-22T10:07:00.000Z';
  const firstPlan = await planDueRuns(nowIso, plan, runRepo, 'canonical');
  assert(firstPlan.length === 3, 'all enabled plan items should be due when no satisfied slot run exists');
  assert(firstPlan[0]?.asset === 'XAU/USD' && firstPlan[0]?.frequency === 'five_minutes', 'sort should prioritize frequency granularity when priority ties');

  await runRepo.saveRunRecord({
    runId: 'run-satisfied',
    asset: 'XAU/USD',
    timeframe: 'M5',
    mode: 'canonical',
    activeBoundary: 'canonical',
    status: 'success',
    startedAt: '2026-04-22T10:05:00.000Z',
    endedAt: '2026-04-22T10:05:30.000Z',
    durationMs: 30_000,
    canonicalEventCount: 1,
    legacyEventCount: null,
    outputEventCount: 1,
    fallbackApplied: false,
    fallbackReason: null,
    boundaryVersion: 'c2c.0.0',
    triggerKind: 'scheduled',
    requestKey: 'scheduled|XAU/USD|M5|five_minutes|2026-04-22T10:05:00.000Z|canonical',
    slotStartAt: '2026-04-22T10:05:00.000Z',
    slotEndAt: '2026-04-22T10:10:00.000Z',
    schedulerTickId: 'tick-1',
    comparison: null,
    diagnosticsSummary: { adapterFailureCount: 0, invalidEventCount: 0, mergeCount: 0, droppedEventCount: 0 },
    providerCapabilities: []
  });

  const secondPlan = await planDueRuns(nowIso, plan, runRepo, 'canonical');
  assert(secondPlan.length === 2, 'successful scheduled slot should suppress redispatch');
  assert(secondPlan.every((item) => !(item.asset === 'XAU/USD' && item.timeframe === 'M5')), 'satisfied slot should be removed from due plan');

  await runRepo.saveRunRecord({
    runId: 'run-failed-slot',
    asset: 'BTC/USD',
    timeframe: 'M15',
    mode: 'canonical',
    activeBoundary: 'none',
    status: 'failed',
    startedAt: '2026-04-22T10:00:00.000Z',
    endedAt: '2026-04-22T10:00:10.000Z',
    durationMs: 10_000,
    canonicalEventCount: 0,
    legacyEventCount: null,
    outputEventCount: 0,
    fallbackApplied: false,
    fallbackReason: 'canonical_failure_without_fallback',
    boundaryVersion: 'c2c.0.0',
    triggerKind: 'scheduled',
    requestKey: 'scheduled|BTC/USD|M15|fifteen_minutes|2026-04-22T10:00:00.000Z|canonical',
    slotStartAt: '2026-04-22T10:00:00.000Z',
    slotEndAt: '2026-04-22T10:15:00.000Z',
    schedulerTickId: 'tick-2',
    comparison: null,
    diagnosticsSummary: { adapterFailureCount: 1, invalidEventCount: 0, mergeCount: 0, droppedEventCount: 0 },
    providerCapabilities: []
  });

  const thirdPlan = await planDueRuns(nowIso, plan, runRepo, 'canonical');
  assert(thirdPlan.some((item) => item.asset === 'BTC/USD' && item.timeframe === 'M15'), 'failed slot should remain due for redispatch policy');
}
