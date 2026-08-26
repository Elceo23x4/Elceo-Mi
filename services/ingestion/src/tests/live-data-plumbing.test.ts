import type { MarketDataProvider } from '@elceo/providers';
import { MarketDataCompositeAdapter } from '@elceo/providers';
import { normalizeEvent } from '../normalization/normalizeEvent';
import {
  appendNormalizedEvents,
  persistChartViewModel,
  readPersistedState,
  setPersistenceStore,
  InMemoryPersistenceStore
} from '../store/persistence-store';
import type { DashboardCognitionViewModel } from '@elceo/types';
import { getDashboardData } from '../app-data/dashboard-data';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

class EmptyProvider implements MarketDataProvider {
  readonly providerId = 'empty';
  async getLatestQuote() {
    return null;
  }
  async getCandles() {
    return [];
  }
}

class QuoteProvider implements MarketDataProvider {
  readonly providerId = 'quote';
  async getLatestQuote(assetCode: string) {
    return {
      type: 'market_quote' as const,
      provider: 'finnhub' as const,
      assetCode,
      last: 2300,
      timestampUtc: new Date().toISOString()
    };
  }
  async getCandles() {
    return [];
  }
}

export async function runLiveDataPlumbingTests(): Promise<void> {
  setPersistenceStore(new InMemoryPersistenceStore());

  const composite = new MarketDataCompositeAdapter({
    finnhub: new EmptyProvider(),
    alphavantage: new QuoteProvider(),
    fmp: new EmptyProvider()
  });
  const quote = await composite.getLatestQuote('XAU/USD');
  assert(Boolean(quote), 'composite fallback should return quote');

  const normalized = normalizeEvent({
    type: 'news_article',
    provider: 'marketaux',
    articleId: 'a-1',
    sourceName: 'marketaux',
    url: 'https://example.com',
    headline: 'Headline',
    summary: 'Summary',
    publishedAtUtc: new Date().toISOString(),
    mentionedAssets: ['XAU/USD'],
    dedupeKey: 'dedupe'
  });
  await appendNormalizedEvents([normalized]);

  const vm: DashboardCognitionViewModel = {
    contract_version: 'dashboard-display-v2',
    asset_code: 'XAU/USD',
    directional_bias: 'bullish',
    confidence_total: 70,
    confidence_anatomy: { sourceConfidence: 70 },
    contradiction: { score: 22, score_availability: 'available', state: 'aligned' },
    zones: [],
    annotations: [],
    evidence_notes: [],
    modules: []
  };
  await persistChartViewModel('XAU/USD', vm);

  const snapshot = await readPersistedState();
  assert(snapshot.normalizedEvents.length > 0, 'normalized events persisted');
  assert(snapshot.chartViewModelByAsset['XAU/USD']?.asset_code === 'XAU/USD', 'dashboard mapping persisted');

  const cold = await getDashboardData('XAU/USD', async () => ({ normalizedEvents: [], chartViewModelByAsset: {} }) as unknown as Awaited<ReturnType<typeof readPersistedState>>);
  assert(cold === null, 'cold dashboard reads are passively unavailable');

  const workspace = await getDashboardData('XAU/USD');
  assert(Boolean(workspace), 'workspace should resolve');
  assert(workspace?.dashboard.asset_code === 'XAU/USD', 'workspace dashboard should map asset');
  assert(Array.isArray(workspace?.chart.annotations), 'chart annotations shape should be array');
}
