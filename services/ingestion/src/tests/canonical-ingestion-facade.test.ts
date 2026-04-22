import { buildCanonicalEventFixture } from '@elceo/schemas';
import type { CanonicalEvent, CanonicalProviderAdapterSuite } from '@elceo/types';
import { CanonicalIngestionFacade, createCanonicalIngestionFacade } from '../facade/canonical-ingestion-facade';
import type { BridgeDiagnosticsSource } from '../bridges/index';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

class NoopBridgeDiagnostics implements BridgeDiagnosticsSource {
  consumeBridgeDroppedRecords() {
    return [];
  }
}

function buildMockSuite(events: CanonicalEvent[], throwNews = false): Partial<CanonicalProviderAdapterSuite> {
  return {
    marketData: {
      getLatestPrice: async () => 1,
      getRecentRange: async () => ({ high: 1, low: 1, close: 1 }),
      getStructuredMarketEvidence: async () => events
    },
    news: throwNews
      ? {
          getRecentNewsEvidence: async () => {
            throw new Error('news down');
          }
        }
      : {
          getRecentNewsEvidence: async () => []
        }
  };
}

export async function runCanonicalIngestionFacadeTests(): Promise<void> {
  const event = buildCanonicalEventFixture({ id: 'facade-1', relatedAssets: ['EUR/USD'], sourceCategory: 'market_data', eventKind: 'price_action' });
  const facade = new CanonicalIngestionFacade(
    buildMockSuite([event]),
    {
      providerCapabilities: [{ providerName: 'finnhub', category: 'market_data', enabled: true, healthyToConstruct: true, reason: null }],
      activeProviderCount: 1,
      activeProvidersByCategory: { market_data: ['finnhub'], macro_calendar: [], macro_context: [], news: [], geopolitics: [] }
    },
    [new NoopBridgeDiagnostics()]
  );

  const result = await facade.collectAssetWindow({ asset: 'EUR/USD', timeframe: 'H1', asOf: '2026-01-02T00:00:00.000Z', fromIso: '2026-01-01T00:00:00.000Z', toIso: '2026-01-02T00:00:00.000Z' });
  assert(result.events.length === 1, 'facade should return canonical events from active providers');
  assert(result.diagnostics.providerCapabilities.length === 1, 'facade should return provider capability diagnostics');

  const degraded = new CanonicalIngestionFacade(
    buildMockSuite([event], true),
    {
      providerCapabilities: [{ providerName: 'newsapi', category: 'news', enabled: true, healthyToConstruct: true, reason: null }],
      activeProviderCount: 1,
      activeProvidersByCategory: { market_data: [], macro_calendar: [], macro_context: [], news: ['newsapi'], geopolitics: [] }
    },
    [new NoopBridgeDiagnostics()]
  );

  const degradedResult = await degraded.collectAssetWindow({ asset: 'EUR/USD', timeframe: 'H1', asOf: '2026-01-02T00:00:00.000Z', fromIso: '2026-01-01T00:00:00.000Z', toIso: '2026-01-02T00:00:00.000Z' });
  assert(degradedResult.diagnostics.adapterFailures.length === 1, 'facade should degrade gracefully when an adapter throws');

  const emptyFacade = createCanonicalIngestionFacade({
    INGESTION_CANONICAL_ENABLED: 'false'
  });
  const emptyResult = await emptyFacade.collectAssetWindow({ asset: 'EUR/USD', timeframe: 'H1', asOf: '2026-01-02T00:00:00.000Z', fromIso: '2026-01-01T00:00:00.000Z', toIso: '2026-01-02T00:00:00.000Z' });
  assert(emptyResult.events.length === 0, 'all adapters disabled should return empty events');
  assert(emptyResult.diagnostics.providerCapabilities.some((item) => item.reason === 'provider_disabled_by_env'), 'disabled reasons should be explicit');
}
