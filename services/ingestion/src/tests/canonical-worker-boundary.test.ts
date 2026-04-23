import { buildCanonicalEventFixture } from '@elceo/schemas';
import type { CanonicalEvent } from '@elceo/types';
import { CanonicalWorkerBoundaryService } from '../runtime/canonical-worker-boundary';
import type { CompositeIngestionDiagnostics } from '../core/event-diagnostics';
import type { FacadeDiagnostics } from '../facade/provider-capabilities';
import type { LegacyRuntimeAdapter } from '../runtime/legacy-runtime-adapter';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

type CanonicalFacadeStub = {
  collectAssetWindow: () => Promise<{ events: CanonicalEvent[]; diagnostics: CompositeIngestionDiagnostics & FacadeDiagnostics }>;
};

class LegacyRuntimeAdapterStub {
  constructor(private readonly result: { events: CanonicalEvent[]; failures: Array<{ stage: string; message: string }> }, private readonly shouldThrow = false) {}

  async collectAssetWindow(): Promise<{ events: CanonicalEvent[]; failures: Array<{ stage: string; message: string }> }> {
    if (this.shouldThrow) throw new Error('legacy failed');
    return this.result;
  }
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

export async function runCanonicalWorkerBoundaryTests(): Promise<void> {
  const canonicalEvent = buildCanonicalEventFixture({ id: 'c1', dedupeKey: 'k1' });
  const legacyEvent = buildCanonicalEventFixture({ id: 'l1', dedupeKey: 'k2' });

  const canonicalSuccessFacade: CanonicalFacadeStub = {
    collectAssetWindow: async () => ({ events: [canonicalEvent], diagnostics: diagnosticsStub() })
  };

  const canonicalFailFacade: CanonicalFacadeStub = {
    collectAssetWindow: async () => {
      throw new Error('canonical failed');
    }
  };

  const legacySuccess = new LegacyRuntimeAdapterStub({ events: [legacyEvent], failures: [] });
  const legacyFailure = new LegacyRuntimeAdapterStub({ events: [], failures: [] }, true);

  const canonicalMode = new CanonicalWorkerBoundaryService(canonicalSuccessFacade, legacySuccess as unknown as LegacyRuntimeAdapter);
  const canonicalModeResult = await canonicalMode.executeAssetWindow({
    asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-01-02T00:00:00.000Z', fromIso: '2026-01-01T00:00:00.000Z', toIso: '2026-01-02T00:00:00.000Z', config: { mode: 'canonical' }
  });
  assert(canonicalModeResult.report.activeBoundary === 'canonical', 'canonical mode success should be canonical active boundary');

  const canonicalNoFallback = new CanonicalWorkerBoundaryService(canonicalFailFacade, legacySuccess as unknown as LegacyRuntimeAdapter);
  const canonicalNoFallbackResult = await canonicalNoFallback.executeAssetWindow({
    asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-01-02T00:00:00.000Z', fromIso: '2026-01-01T00:00:00.000Z', toIso: '2026-01-02T00:00:00.000Z', config: { mode: 'canonical', legacyFallbackOnCanonicalFailure: false }
  });
  assert(canonicalNoFallbackResult.report.status === 'failed', 'canonical failure without fallback should fail');

  const canonicalWithFallback = new CanonicalWorkerBoundaryService(canonicalFailFacade, legacySuccess as unknown as LegacyRuntimeAdapter);
  const canonicalWithFallbackResult = await canonicalWithFallback.executeAssetWindow({
    asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-01-02T00:00:00.000Z', fromIso: '2026-01-01T00:00:00.000Z', toIso: '2026-01-02T00:00:00.000Z', config: { mode: 'canonical', legacyFallbackOnCanonicalFailure: true }
  });
  assert(canonicalWithFallbackResult.report.activeBoundary === 'legacy', 'canonical fallback should activate legacy boundary');
  assert(canonicalWithFallbackResult.report.status === 'partial_success', 'canonical fallback should be partial_success');

  const legacyMode = new CanonicalWorkerBoundaryService(canonicalSuccessFacade, legacySuccess as unknown as LegacyRuntimeAdapter);
  const legacyModeResult = await legacyMode.executeAssetWindow({
    asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-01-02T00:00:00.000Z', fromIso: '2026-01-01T00:00:00.000Z', toIso: '2026-01-02T00:00:00.000Z', config: { mode: 'legacy' }
  });
  assert(legacyModeResult.report.activeBoundary === 'legacy', 'legacy mode should be legacy active boundary');

  const shadowBothSuccess = new CanonicalWorkerBoundaryService(canonicalSuccessFacade, legacySuccess as unknown as LegacyRuntimeAdapter);
  const shadowBothSuccessResult = await shadowBothSuccess.executeAssetWindow({
    asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-01-02T00:00:00.000Z', fromIso: '2026-01-01T00:00:00.000Z', toIso: '2026-01-02T00:00:00.000Z', config: { mode: 'shadow' }
  });
  assert(shadowBothSuccessResult.report.activeBoundary === 'canonical', 'shadow success should keep canonical active boundary');
  assert(shadowBothSuccessResult.report.comparison !== null, 'shadow success should include comparison');

  const shadowLegacyFailure = new CanonicalWorkerBoundaryService(canonicalSuccessFacade, legacyFailure as unknown as LegacyRuntimeAdapter);
  const shadowLegacyFailureResult = await shadowLegacyFailure.executeAssetWindow({
    asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-01-02T00:00:00.000Z', fromIso: '2026-01-01T00:00:00.000Z', toIso: '2026-01-02T00:00:00.000Z', config: { mode: 'shadow' }
  });
  assert(shadowLegacyFailureResult.report.status === 'partial_success', 'shadow legacy failure with canonical success should be partial_success');

  const shadowCanonicalFailFallback = new CanonicalWorkerBoundaryService(canonicalFailFacade, legacySuccess as unknown as LegacyRuntimeAdapter);
  const shadowCanonicalFailFallbackResult = await shadowCanonicalFailFallback.executeAssetWindow({
    asset: 'XAU/USD', timeframe: 'H1', asOf: '2026-01-02T00:00:00.000Z', fromIso: '2026-01-01T00:00:00.000Z', toIso: '2026-01-02T00:00:00.000Z', config: { mode: 'shadow', legacyFallbackOnCanonicalFailure: true }
  });
  assert(shadowCanonicalFailFallbackResult.report.activeBoundary === 'legacy', 'shadow canonical failure fallback should activate legacy boundary');
}
