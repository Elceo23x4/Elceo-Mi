import type { CanonicalAssetSymbol, CanonicalEvent, CanonicalProviderAdapterSuite, Timeframe } from '@elceo/types';
import { CompositeEventIngestionService } from '../core/composite-event-ingestion-service';
import type { CompositeIngestionDiagnostics } from '../core/event-diagnostics';
import type { BridgeDiagnosticsSource } from '../bridges/index';
import { buildCanonicalProviderSuite, type CanonicalProviderSuiteBuildResult, type CanonicalSuiteBuilderDependencies } from './provider-suite-builder';
import { CANONICAL_BOUNDARY_VERSION, type FacadeDiagnostics } from './provider-capabilities';

export type CanonicalIngestionCollectParams = {
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  asOf: string;
  fromIso: string;
  toIso: string;
};

export type CanonicalIngestionFacadeResult = {
  events: CanonicalEvent[];
  diagnostics: CompositeIngestionDiagnostics & FacadeDiagnostics;
};

export class CanonicalIngestionFacade {
  private readonly ingestionService: CompositeEventIngestionService;

  constructor(
    private readonly suite: Partial<CanonicalProviderAdapterSuite>,
    private readonly suiteDiagnostics: Pick<CanonicalProviderSuiteBuildResult, 'providerCapabilities' | 'activeProvidersByCategory' | 'activeProviderCount'>,
    private readonly bridgeDiagnosticsSources: BridgeDiagnosticsSource[]
  ) {
    this.ingestionService = new CompositeEventIngestionService(suite);
  }

  async collectAssetWindow(params: CanonicalIngestionCollectParams): Promise<CanonicalIngestionFacadeResult> {
    const base = await this.ingestionService.collectForAssetWindow(params);

    for (const source of this.bridgeDiagnosticsSources) {
      const dropped = source.consumeBridgeDroppedRecords();
      for (const item of dropped) {
        base.diagnostics.droppedEvents.push({
          reason: item.reason,
          eventId: item.eventId,
          adapterName: item.adapterName,
          message: item.message
        });
      }
    }

    return {
      events: base.events,
      diagnostics: {
        ...base.diagnostics,
        providerCapabilities: this.suiteDiagnostics.providerCapabilities,
        activeProviderCount: this.suiteDiagnostics.activeProviderCount,
        activeProvidersByCategory: this.suiteDiagnostics.activeProvidersByCategory,
        canonicalBoundaryVersion: CANONICAL_BOUNDARY_VERSION
      }
    };
  }
}

export function createCanonicalIngestionFacade(
  env: Record<string, string | undefined> = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {},
  dependencies: CanonicalSuiteBuilderDependencies = {}
): CanonicalIngestionFacade {
  const suiteBuild = buildCanonicalProviderSuite(env, dependencies);
  return new CanonicalIngestionFacade(suiteBuild.suite, suiteBuild, suiteBuild.bridgeDiagnosticsSources);
}
