import { buildCanonicalEventFixture } from '@elceo/schemas';
import { CanonicalWorkerBoundaryService } from '../runtime/canonical-worker-boundary';
import { MemoryIngestionPersistenceRepository } from '../persistence/memory-ingestion-repository';
import { IngestionPublicationStagingService } from '../publish/staging-service';
import { MemoryOutboxRepository } from '../publish/outbox-repository';
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
    return { events: [buildCanonicalEventFixture({ id: 'legacy-outbox', dedupeKey: 'legacy-outbox' })], failures: [] };
  }
}

class FailingStagingService extends IngestionPublicationStagingService {
  constructor() {
    super(new MemoryOutboxRepository());
  }

  async stageRunPublications(): Promise<never> {
    throw new Error('stage failed');
  }
}

export async function runRuntimeOutboxIntegrationTests(): Promise<void> {
  const persistence = new MemoryIngestionPersistenceRepository();
  const outboxRepo = new MemoryOutboxRepository();
  const staging = new IngestionPublicationStagingService(outboxRepo);

  const service = new CanonicalWorkerBoundaryService(
    {
      collectAssetWindow: async () => ({
        events: [buildCanonicalEventFixture({ id: 'outbox-1', dedupeKey: 'outbox-1' })],
        diagnostics: diagnosticsStub()
      })
    },
    new LegacyAdapterStub() as unknown as LegacyRuntimeAdapter,
    persistence,
    staging
  );

  const result = await service.executeAssetWindow({
    asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-04-22T10:00:00.000Z', fromIso: '2026-04-22T09:00:00.000Z', toIso: '2026-04-22T10:00:00.000Z', config: { mode: 'canonical' }
  });

  assert(result.report.status === 'success', 'successful run should remain success when outbox staging succeeds');
  const outboxItems = await outboxRepo.listDueOutboxItems(10, '2026-04-22T23:59:59.000Z');
  assert(outboxItems.length === 2, 'canonical run should stage run_completed and event_snapshot outbox items');

  const failingService = new CanonicalWorkerBoundaryService(
    {
      collectAssetWindow: async () => ({
        events: [buildCanonicalEventFixture({ id: 'outbox-2', dedupeKey: 'outbox-2' })],
        diagnostics: diagnosticsStub()
      })
    },
    new LegacyAdapterStub() as unknown as LegacyRuntimeAdapter,
    persistence,
    new FailingStagingService()
  );

  const failingResult = await failingService.executeAssetWindow({
    asset: 'EUR/USD', timeframe: 'H1', asOf: '2026-04-22T10:00:00.000Z', fromIso: '2026-04-22T09:00:00.000Z', toIso: '2026-04-22T10:00:00.000Z', config: { mode: 'canonical' }
  });

  assert(failingResult.report.status === 'partial_success', 'staging failure after persistence should downgrade status to partial_success');
  assert((failingResult.report.fallbackReason ?? '').startsWith('persistence_or_publication_failure:'), 'staging failure reason should be explicit in fallbackReason');
}
