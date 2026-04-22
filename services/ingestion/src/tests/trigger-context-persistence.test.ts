import { buildCanonicalEventFixture } from '@elceo/schemas';
import { MemoryIngestionPersistenceRepository } from '../persistence/memory-ingestion-repository';
import { CanonicalWorkerBoundaryService } from '../runtime/canonical-worker-boundary';
import { createManualIngestionRequest, createReplayIngestionRequest, createScheduledIngestionRequest } from '../scheduler/trigger-context';
import type { CompositeIngestionDiagnostics } from '../core/event-diagnostics';
import type { FacadeDiagnostics } from '../facade/provider-capabilities';
import type { LegacyRuntimeAdapter } from '../runtime/legacy-runtime-adapter';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function diagnosticsStub(): CompositeIngestionDiagnostics & FacadeDiagnostics {
  return {
    adapterFailures: [],
    invalidEvents: [],
    merges: [],
    droppedEvents: [],
    totalFetched: 0,
    totalValidated: 0,
    totalMergedGroups: 0,
    totalOutput: 0,
    providerCapabilities: [],
    activeProviderCount: 0,
    activeProvidersByCategory: { market_data: [], macro_calendar: [], macro_context: [], news: [], geopolitics: [] },
    canonicalBoundaryVersion: 'c2c.0.0'
  };
}

class LegacyAdapterStub {
  async collectAssetWindow() {
    return { events: [buildCanonicalEventFixture({ id: 'legacy-trigger', dedupeKey: 'legacy-trigger' })], failures: [] };
  }
}

export async function runTriggerContextPersistenceTests(): Promise<void> {
  const persistence = new MemoryIngestionPersistenceRepository();
  const service = new CanonicalWorkerBoundaryService(
    {
      collectAssetWindow: async () => ({
        events: [buildCanonicalEventFixture({ id: 'ctx-1', dedupeKey: 'ctx-1' })],
        diagnostics: diagnosticsStub()
      })
    },
    new LegacyAdapterStub() as unknown as LegacyRuntimeAdapter,
    persistence
  );

  const scheduledContext = createScheduledIngestionRequest({
    asset: 'XAU/USD',
    timeframe: 'H1',
    requestedAt: '2026-04-22T10:00:05.000Z',
    frequency: 'hourly',
    slotStartAt: '2026-04-22T10:00:00.000Z',
    slotEndAt: '2026-04-22T11:00:00.000Z',
    mode: 'canonical',
    schedulerTickId: 'tick-ctx-1'
  });

  const scheduledResult = await service.executeAssetWindow({
    asset: 'XAU/USD',
    timeframe: 'H1',
    asOf: '2026-04-22T11:00:00.000Z',
    fromIso: '2026-04-22T09:00:00.000Z',
    toIso: '2026-04-22T11:00:00.000Z',
    config: { mode: 'canonical' },
    triggerContext: scheduledContext
  });

  const scheduledPersisted = await persistence.runRepository.getRunById(scheduledResult.report.runId);
  assert(scheduledPersisted?.triggerKind === 'scheduled', 'scheduled run should persist scheduled trigger kind');
  assert(scheduledPersisted?.slotStartAt === '2026-04-22T10:00:00.000Z', 'scheduled run should persist slotStartAt');
  assert((scheduledPersisted?.requestKey ?? '').startsWith('scheduled|XAU/USD|H1|hourly|'), 'scheduled run should persist deterministic scheduled requestKey');

  const manualContext = createManualIngestionRequest({
    asset: 'EUR/USD',
    timeframe: 'H1',
    requestedAt: '2026-04-22T10:15:00.000Z',
    requestedBy: 'ops'
  });

  const manualResult = await service.executeAssetWindow({
    asset: 'EUR/USD',
    timeframe: 'H1',
    asOf: '2026-04-22T10:15:00.000Z',
    fromIso: '2026-04-22T09:15:00.000Z',
    toIso: '2026-04-22T10:15:00.000Z',
    config: { mode: 'canonical' },
    triggerContext: manualContext
  });

  const manualPersisted = await persistence.runRepository.getRunById(manualResult.report.runId);
  assert(manualPersisted?.triggerKind === 'manual', 'manual run should persist manual trigger kind');
  assert(manualPersisted?.slotStartAt === null && manualPersisted.slotEndAt === null, 'manual run should preserve null slot bounds');

  const replayContext = createReplayIngestionRequest({
    asset: 'BTC/USD',
    timeframe: 'H1',
    requestedAt: '2026-04-22T10:30:00.000Z',
    replayReference: 'run-prev-42',
    requestedBy: 'replay-tool'
  });

  const replayResult = await service.executeAssetWindow({
    asset: 'BTC/USD',
    timeframe: 'H1',
    asOf: '2026-04-22T10:30:00.000Z',
    fromIso: '2026-04-22T09:30:00.000Z',
    toIso: '2026-04-22T10:30:00.000Z',
    config: { mode: 'canonical' },
    triggerContext: replayContext
  });

  const replayPersisted = await persistence.runRepository.getRunById(replayResult.report.runId);
  assert(replayPersisted?.triggerKind === 'replay', 'replay run should persist replay trigger kind');
  assert((replayPersisted?.requestKey ?? '').includes('replay|BTC/USD|H1|run-prev-42'), 'replay run should persist replay request key format');
}
