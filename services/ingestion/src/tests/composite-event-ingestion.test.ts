import { buildCanonicalEventFixture } from '@elceo/schemas';
import type { CanonicalEvent, CanonicalProviderAdapterSuite } from '@elceo/types';
import { CompositeEventIngestionService } from '../core/composite-event-ingestion-service';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function buildSuite(events: {
  market?: CanonicalEvent[];
  upcoming?: CanonicalEvent[];
  published?: CanonicalEvent[];
  news?: CanonicalEvent[];
  geo?: CanonicalEvent[];
  context?: CanonicalEvent[];
  throwNews?: boolean;
}): Partial<CanonicalProviderAdapterSuite> {
  return {
    marketData: {
      getLatestPrice: async () => 1,
      getRecentRange: async () => ({ high: 1, low: 1, close: 1 }),
      getStructuredMarketEvidence: async () => events.market ?? []
    },
    macroCalendar: {
      getUpcomingEvents: async () => events.upcoming ?? [],
      getRecentPublishedEvents: async () => events.published ?? []
    },
    news: events.throwNews
      ? {
          getRecentNewsEvidence: async () => {
            throw new Error('news adapter down');
          }
        }
      : {
          getRecentNewsEvidence: async () => events.news ?? []
        },
    geopolitics: {
      getRecentGeopoliticalEvidence: async () => events.geo ?? []
    },
    macroContext: {
      getMacroContext: async () => events.context ?? []
    }
  };
}

export async function runCompositeEventIngestionTests(): Promise<void> {
  const duplicateA = buildCanonicalEventFixture({ id: 'dup-a', sourceName: 'NewsAPI', sourceCategory: 'news', eventKind: 'news', title: 'Fed holds rates', relatedAssets: ['EUR/USD'], detectedAt: '2026-01-01T10:01:00.000Z' });
  const duplicateB = buildCanonicalEventFixture({ ...duplicateA, id: 'dup-b', sourceName: 'Marketaux', sourceId: 'src-b', detectedAt: '2026-01-01T10:02:00.000Z' });
  const unique = buildCanonicalEventFixture({ id: 'unique-1', eventKind: 'macro_context', sourceName: 'IMF', sourceCategory: 'macro_context', impact: 'critical', relatedAssets: ['EUR/USD'], detectedAt: '2026-01-01T10:03:00.000Z' });

  const service = new CompositeEventIngestionService(buildSuite({ market: [duplicateA], news: [duplicateB], context: [unique] }));
  const result = await service.collectForAssetWindow({ asset: 'EUR/USD', timeframe: 'H1', asOf: '2026-01-01T11:00:00.000Z', fromIso: '2026-01-01T00:00:00.000Z', toIso: '2026-01-02T00:00:00.000Z' });

  assert(result.events.length === 2, 'duplicates collapse and unique event retained');
  assert(result.diagnostics.totalMergedGroups === 1, 'merge diagnostics should track merged groups');
  const first = result.events[0];
  const second = result.events[1];
  if (!first || !second) throw new Error('Expected sorted events to exist');
  assert(first.relevanceScore >= second.relevanceScore, 'final output should be deterministically sorted');

  const withFailure = new CompositeEventIngestionService(buildSuite({ market: [unique], throwNews: true }));
  const failedResult = await withFailure.collectForAssetWindow({ asset: 'EUR/USD', timeframe: 'H1', asOf: '2026-01-01T11:00:00.000Z', fromIso: '2026-01-01T00:00:00.000Z', toIso: '2026-01-02T00:00:00.000Z' });
  assert(failedResult.events.length >= 1, 'adapter failure should not poison all results');
  assert(failedResult.diagnostics.adapterFailures.length === 1, 'adapter failure should be captured in diagnostics');

  const invalidEvent = { ...unique, occurredAt: 'not-an-iso-date' } as unknown as CanonicalEvent;
  const withInvalid = new CompositeEventIngestionService(buildSuite({ market: [invalidEvent], context: [unique] }));
  const invalidResult = await withInvalid.collectForAssetWindow({ asset: 'EUR/USD', timeframe: 'H1', asOf: '2026-01-01T11:00:00.000Z', fromIso: '2026-01-01T00:00:00.000Z', toIso: '2026-01-02T00:00:00.000Z' });
  assert(invalidResult.diagnostics.invalidEvents.length === 1, 'invalid events should be dropped with diagnostics');

  const marketOnlySuite = buildSuite({ market: [unique] });
  const missingOptional = new CompositeEventIngestionService(marketOnlySuite.marketData ? { marketData: marketOnlySuite.marketData } : {});
  const missingOptionalResult = await missingOptional.collectForAssetWindow({ asset: 'EUR/USD', timeframe: 'H1', asOf: '2026-01-01T11:00:00.000Z', fromIso: '2026-01-01T00:00:00.000Z', toIso: '2026-01-02T00:00:00.000Z' });
  assert(missingOptionalResult.events.length === 1, 'missing optional adapters should not break collection');
}
