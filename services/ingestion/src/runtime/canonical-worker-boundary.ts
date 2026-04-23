import type { CanonicalAssetSymbol, CanonicalEvent, Timeframe } from '@elceo/types';
import type { CompositeIngestionDiagnostics } from '../core/event-diagnostics';
import { createCanonicalIngestionFacade } from '../facade/canonical-ingestion-facade';
import type { FacadeDiagnostics } from '../facade/provider-capabilities';
import { LegacyRuntimeAdapter } from './legacy-runtime-adapter';
import { DEFAULT_INGESTION_RUNTIME_CONFIG, type IngestionRuntimeConfig } from './execution-mode';
import type { IngestionRunReport } from './run-report';
import { buildComparisonFromCanonicalAndLegacy, computeRunStatus, createIngestionRunId, summarizeDiagnostics } from './report-helpers';
import { createIngestionPersistenceRepository } from '../persistence/index';
import type { IngestionPersistenceRepository, IngestionRunRecordInput } from '../persistence/contracts';
import { assertValidTriggerContext, createDefaultTriggerContext, type IngestionTriggerContext } from '../scheduler/trigger-context';
import { createOutboxRepository } from '../publish/outbox-repository';
import { IngestionPublicationStagingService } from '../publish/staging-service';

export type RuntimeExecuteParams = {
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  asOf: string;
  fromIso: string;
  toIso: string;
  config?: Partial<IngestionRuntimeConfig>;
  triggerContext?: IngestionTriggerContext;
};

function resolveRuntimeConfig(config: Partial<IngestionRuntimeConfig> | undefined): IngestionRuntimeConfig {
  return {
    mode: config?.mode ?? DEFAULT_INGESTION_RUNTIME_CONFIG.mode,
    legacyFallbackOnCanonicalFailure: config?.legacyFallbackOnCanonicalFailure ?? DEFAULT_INGESTION_RUNTIME_CONFIG.legacyFallbackOnCanonicalFailure,
    strictCanonicalFailure: config?.strictCanonicalFailure ?? DEFAULT_INGESTION_RUNTIME_CONFIG.strictCanonicalFailure,
    boundaryVersion: config?.boundaryVersion ?? DEFAULT_INGESTION_RUNTIME_CONFIG.boundaryVersion
  };
}

function emptyDiagnostics(): CompositeIngestionDiagnostics & FacadeDiagnostics {
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
    canonicalBoundaryVersion: DEFAULT_INGESTION_RUNTIME_CONFIG.boundaryVersion
  };
}

type CanonicalFacadeLike = {
  collectAssetWindow: (params: {
    asset: CanonicalAssetSymbol;
    timeframe: Timeframe;
    asOf: string;
    fromIso: string;
    toIso: string;
  }) => Promise<{ events: CanonicalEvent[]; diagnostics: CompositeIngestionDiagnostics & FacadeDiagnostics }>;
};

export class CanonicalWorkerBoundaryService {
  constructor(
    private readonly canonicalFacade: CanonicalFacadeLike,
    private readonly legacyRuntimeAdapter: LegacyRuntimeAdapter = new LegacyRuntimeAdapter(),
    private readonly persistenceRepository: IngestionPersistenceRepository | null = null,
    private readonly publicationStagingService: IngestionPublicationStagingService | null = null
  ) {}

  async executeAssetWindow(params: RuntimeExecuteParams): Promise<{
    events: CanonicalEvent[];
    report: IngestionRunReport;
    diagnostics: CompositeIngestionDiagnostics & FacadeDiagnostics;
  }> {
    const runtimeConfig = resolveRuntimeConfig(params.config);
    const startedAt = new Date().toISOString();
    const runId = createIngestionRunId();
    const triggerContext = params.triggerContext ?? createDefaultTriggerContext({
      asset: params.asset,
      timeframe: params.timeframe,
      requestedAt: startedAt
    });
    assertValidTriggerContext(triggerContext);

    let canonicalEvents: CanonicalEvent[] = [];
    let legacyEvents: CanonicalEvent[] = [];
    let diagnostics = emptyDiagnostics();
    let activeBoundary: 'canonical' | 'legacy' | 'none' = 'none';
    let fallbackApplied = false;
    let fallbackReason: string | null = null;
    let comparison: IngestionRunReport['comparison'] = null;
    let partialFlag = false;

    const runLegacy = async (): Promise<void> => {
      const legacy = await this.legacyRuntimeAdapter.collectAssetWindow(params);
      legacyEvents = legacy.events;
      if (legacy.failures.length > 0) {
        partialFlag = true;
      }
    };

    if (runtimeConfig.mode === 'legacy') {
      await runLegacy();
      activeBoundary = 'legacy';
    } else if (runtimeConfig.mode === 'canonical') {
      try {
        const canonical = await this.canonicalFacade.collectAssetWindow(params);
        diagnostics = canonical.diagnostics;
        canonicalEvents = canonical.events;
        activeBoundary = 'canonical';
      } catch {
        if (runtimeConfig.legacyFallbackOnCanonicalFailure) {
          await runLegacy();
          activeBoundary = 'legacy';
          fallbackApplied = true;
          fallbackReason = 'canonical_failure_legacy_fallback';
        } else {
          activeBoundary = 'none';
        }
      }
    } else {
      let canonicalSucceeded = false;
      try {
        const canonical = await this.canonicalFacade.collectAssetWindow(params);
        diagnostics = canonical.diagnostics;
        canonicalEvents = canonical.events;
        canonicalSucceeded = true;
        activeBoundary = 'canonical';
      } catch {
        canonicalSucceeded = false;
      }

      try {
        await runLegacy();
      } catch {
        partialFlag = true;
      }

      if (canonicalSucceeded && legacyEvents.length >= 0) {
        comparison = buildComparisonFromCanonicalAndLegacy(canonicalEvents, legacyEvents);
      }

      if (!canonicalSucceeded) {
        if (runtimeConfig.legacyFallbackOnCanonicalFailure) {
          activeBoundary = 'legacy';
          fallbackApplied = true;
          fallbackReason = 'canonical_failure_shadow_legacy_fallback';
        } else {
          activeBoundary = 'none';
          fallbackReason = 'canonical_failure_without_fallback';
        }
      } else if (legacyEvents.length === 0) {
        partialFlag = true;
      }
    }

    if (runtimeConfig.strictCanonicalFailure && activeBoundary === 'none' && runtimeConfig.mode !== 'legacy') {
      fallbackApplied = false;
      fallbackReason = null;
    }

    const outputEvents = activeBoundary === 'canonical' ? canonicalEvents : activeBoundary === 'legacy' ? legacyEvents : [];
    const endedAt = new Date().toISOString();
    const durationMs = Math.max(0, Date.parse(endedAt) - Date.parse(startedAt));
    const status = computeRunStatus({ activeBoundary, fallbackApplied, partialFlag });

    let report: IngestionRunReport = {
      runId,
      mode: runtimeConfig.mode,
      activeBoundary,
      asset: params.asset,
      timeframe: params.timeframe,
      startedAt,
      endedAt,
      durationMs,
      status,
      canonicalEventCount: canonicalEvents.length,
      legacyEventCount: runtimeConfig.mode === 'canonical' && !fallbackApplied ? null : legacyEvents.length,
      outputEventCount: outputEvents.length,
      fallbackApplied,
      fallbackReason,
      boundaryVersion: runtimeConfig.boundaryVersion,
      triggerKind: triggerContext.triggerKind,
      requestKey: triggerContext.requestKey,
      slotStartAt: triggerContext.slotStartAt,
      slotEndAt: triggerContext.slotEndAt,
      schedulerTickId: triggerContext.schedulerTickId,
      comparison,
      diagnosticsSummary: summarizeDiagnostics(diagnostics),
      providerCapabilities: diagnostics.providerCapabilities
    };

    if (this.persistenceRepository) {
      try {
        const persistRecord: IngestionRunRecordInput = {
          runId: report.runId,
          asset: report.asset,
          timeframe: report.timeframe,
          mode: report.mode,
          activeBoundary: report.activeBoundary,
          status: report.status,
          startedAt: report.startedAt,
          endedAt: report.endedAt,
          durationMs: report.durationMs,
          canonicalEventCount: report.canonicalEventCount,
          legacyEventCount: report.legacyEventCount,
          outputEventCount: report.outputEventCount,
          fallbackApplied: report.fallbackApplied,
          fallbackReason: report.fallbackReason,
          boundaryVersion: report.boundaryVersion,
          triggerKind: report.triggerKind,
          requestKey: report.requestKey,
          slotStartAt: report.slotStartAt,
          slotEndAt: report.slotEndAt,
          schedulerTickId: report.schedulerTickId,
          comparison: report.comparison,
          diagnosticsSummary: report.diagnosticsSummary,
          providerCapabilities: report.providerCapabilities
        };

        await this.persistenceRepository.persistRunWithEvents(persistRecord, outputEvents);

        if (this.publicationStagingService) {
          const persistedRun = await this.persistenceRepository.runRepository.getRunById(report.runId);
          if (!persistedRun) {
            throw new Error('persisted_run_not_found_for_publication_staging');
          }
          await this.publicationStagingService.stageRunPublications(persistedRun, outputEvents, endedAt);
        }
      } catch (error) {
        report = {
          ...report,
          status: 'partial_success',
          fallbackApplied: true,
          fallbackReason: `persistence_or_publication_failure:${error instanceof Error ? error.message : 'unknown'}`
        };
      }
    }

    return {
      events: outputEvents,
      report,
      diagnostics
    };
  }
}

export function createCanonicalWorkerBoundaryService(env: Record<string, string | undefined> = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}): CanonicalWorkerBoundaryService {
  const persistenceRepository = createIngestionPersistenceRepository(env);
  const publicationStagingService = new IngestionPublicationStagingService(createOutboxRepository(env));
  return new CanonicalWorkerBoundaryService(createCanonicalIngestionFacade(env), new LegacyRuntimeAdapter(), persistenceRepository, publicationStagingService);
}
