import { buildProviderGraph } from './adapters/build-provider-graph';
import { MarketIngestionPipeline } from './pipelines/marketIngestionPipeline';
import { MacroIngestionPipeline } from './pipelines/macroIngestionPipeline';
import { NewsIngestionPipeline } from './pipelines/newsIngestionPipeline';
import { GeopoliticsIngestionPipeline } from './pipelines/geopoliticsIngestionPipeline';
import { ExtractionIngestionPipeline } from './pipelines/extractionIngestionPipeline';
import { createKafkaTransport } from './publishers/kafka-publisher';
import { markProviderFailure, markProviderSuccess, getProviderHealthSnapshot } from './source-health/tracker';
import { appendNormalizedEvents, persistChartViewModel, persistCognition, persistEvidence, persistSourceHealthSnapshot } from './store/persistence-store';
import { assembleEvidence } from './assembly/evidence-assembly';
import { ReasoningService } from '@elceo/reasoning';
import { ChartIntelligenceService } from '@elceo/chart-intelligence';
import type { InternalNormalizedEvent } from '@elceo/schemas';

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

export async function runIngestionTick(): Promise<void> {
  const providers = buildProviderGraph();
  const transport = await createKafkaTransport(runtimeEnv());

  const market = new MarketIngestionPipeline(providers.marketComposite, transport.publisher);
  const macro = new MacroIngestionPipeline(providers.macroComposite, transport.publisher);
  const news = new NewsIngestionPipeline(providers.newsComposite, transport.publisher);
  const geopolitics = new GeopoliticsIngestionPipeline(providers.geopolitics, transport.publisher);
  const extraction = new ExtractionIngestionPipeline(providers.extractionPrimary, providers.extractionFallback, transport.publisher);

  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60_000).toISOString();
  const nowIso = now.toISOString();

  const normalizedEvents: InternalNormalizedEvent[] = [];

  try {
    normalizedEvents.push(...(await market.ingestAsset('XAU/USD')));
    markProviderSuccess('finnhub', 'market');
  } catch (error) {
    markProviderFailure('finnhub', 'market', error instanceof Error ? error.message : 'market ingestion failed');
  }

  try {
    normalizedEvents.push(...(await macro.ingestWindow(tenMinutesAgo, nowIso)));
    markProviderSuccess('finnhub', 'macro');
  } catch (error) {
    markProviderFailure('finnhub', 'macro', error instanceof Error ? error.message : 'macro ingestion failed');
  }

  try {
    normalizedEvents.push(...(await news.ingest('XAU/USD', tenMinutesAgo, nowIso)));
    markProviderSuccess('marketaux', 'news');
  } catch (error) {
    markProviderFailure('marketaux', 'news', error instanceof Error ? error.message : 'news ingestion failed');
  }

  try {
    normalizedEvents.push(...(await geopolitics.ingest('gold OR fed OR inflation', tenMinutesAgo, nowIso)));
    markProviderSuccess('gdelt', 'geopolitics');
  } catch (error) {
    markProviderFailure('gdelt', 'geopolitics', error instanceof Error ? error.message : 'geopolitics ingestion failed');
  }

  try {
    normalizedEvents.push(...(await extraction.ingest('https://www.federalreserve.gov/newsevents/pressreleases.htm')));
    markProviderSuccess('firecrawl', 'extraction');
  } catch (error) {
    markProviderFailure('firecrawl', 'extraction', error instanceof Error ? error.message : 'extraction ingestion failed');
  }

  await appendNormalizedEvents(normalizedEvents);
  await persistSourceHealthSnapshot(getProviderHealthSnapshot());

  const assetEvents = normalizedEvents.filter((event) => JSON.stringify(event.payload).includes('XAU/USD'));
  const evidence = assembleEvidence('XAU/USD', assetEvents);
  await persistEvidence('XAU/USD', evidence);

  const reasoningService = new ReasoningService();
  const cognition = reasoningService.reasonAssembly(evidence).intraday;
  await persistCognition('XAU/USD', cognition);

  const candles = normalizedEvents
    .filter((event) => event.eventType === 'market_candle')
    .map((event) => event.payload)
    .filter((payload): payload is Extract<typeof payload, { type: 'market_candle' }> => payload.type === 'market_candle');

  const chart = new ChartIntelligenceService();
  const output = chart.buildChartIntelligence('XAU/USD', cognition, evidence, candles);
  await persistChartViewModel('XAU/USD', output.dashboardViewModel);
}
