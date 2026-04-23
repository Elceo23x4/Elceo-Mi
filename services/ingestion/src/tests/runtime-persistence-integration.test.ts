import { buildCanonicalEventFixture } from '@elceo/schemas';
import { CanonicalWorkerBoundaryService } from '../runtime/canonical-worker-boundary';
import { MemoryIngestionPersistenceRepository } from '../persistence/memory-ingestion-repository';
import type { CompositeIngestionDiagnostics } from '../core/event-diagnostics';
import type { FacadeDiagnostics } from '../facade/provider-capabilities';
import type { LegacyRuntimeAdapter } from '../runtime/legacy-runtime-adapter';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function diagnosticsStub(): CompositeIngestionDiagnostics & FacadeDiagnostics {
  return {
    adapterFailures: [], invalidEvents: [], merges: [], droppedEvents: [],
    totalFetched: 0, totalValidated: 0, totalMergedGroups: 0, totalOutput: 0,
    providerCapabilities: [], activeProviderCount: 0,
    activeProvidersByCategory: { market_data: [], macro_calendar: [], macro_context: [], news: [], geopolitics: [] },
    canonicalBoundaryVersion: 'c2c.0.0'
  };
}

class LegacyAdapterStub {
  async collectAssetWindow() {
    return { events: [buildCanonicalEventFixture({ id: 'legacy-persist', dedupeKey: 'legacy-persist' })], failures: [] };
  }
}

class FailingPersistenceRepository extends MemoryIngestionPersistenceRepository {
  async persistRunWithEvents(): Promise<void> {
    throw new Error('persist failed');
  }
}

export async function runRuntimePersistenceIntegrationTests(): Promise<void> {
  const memoryPersistence = new MemoryIngestionPersistenceRepository();
  const service = new CanonicalWorkerBoundaryService(
    {
      collectAssetWindow: async () => ({
        events: [buildCanonicalEventFixture({ id: 'persist-1', dedupeKey: 'persist-1' })],
        diagnostics: diagnosticsStub()
      })
    },
    new LegacyAdapterStub() as unknown as LegacyRuntimeAdapter,
    memoryPersistence
  );

  const result = await service.executeAssetWindow({
    asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-01-01T00:00:00.000Z', fromIso: '2025-12-31T23:00:00.000Z', toIso: '2026-01-01T00:00:00.000Z', config: { mode: 'canonical' }
  });
  assert(result.report.status === 'success', 'successful run remains success when persistence succeeds');

  const persistedRun = await memoryPersistence.runRepository.getRunById(result.report.runId);
  assert(Boolean(persistedRun), 'canonical worker boundary persists run report');
  const persistedEvents = await memoryPersistence.eventSnapshotRepository.getEventsByRunId(result.report.runId);
  assert(persistedEvents.length === 1, 'canonical worker boundary persists output events');

  const fallbackService = new CanonicalWorkerBoundaryService(
    { collectAssetWindow: async () => { throw new Error('canonical fail'); } },
    new LegacyAdapterStub() as unknown as LegacyRuntimeAdapter,
    memoryPersistence
  );
  const fallbackResult = await fallbackService.executeAssetWindow({
    asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-01-01T00:00:00.000Z', fromIso: '2025-12-31T23:00:00.000Z', toIso: '2026-01-01T00:00:00.000Z', config: { mode: 'canonical', legacyFallbackOnCanonicalFailure: true }
  });
  assert(fallbackResult.report.status === 'partial_success', 'partial_success run is still persisted through boundary integration path');

  const failingPersistenceService = new CanonicalWorkerBoundaryService(
    {
      collectAssetWindow: async () => ({
        events: [buildCanonicalEventFixture({ id: 'persist-fail', dedupeKey: 'persist-fail' })],
        diagnostics: diagnosticsStub()
      })
    },
    new LegacyAdapterStub() as unknown as LegacyRuntimeAdapter,
    new FailingPersistenceRepository()
  );

  const persistFailureResult = await failingPersistenceService.executeAssetWindow({
    asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-01-01T00:00:00.000Z', fromIso: '2025-12-31T23:00:00.000Z', toIso: '2026-01-01T00:00:00.000Z', config: { mode: 'canonical' }
  });
  assert(persistFailureResult.report.status === 'partial_success', 'persistence failure should downgrade to partial_success');
  assert((persistFailureResult.report.fallbackReason ?? '').startsWith('persistence_or_publication_failure:'), 'persistence failure note should be explicit');
}
