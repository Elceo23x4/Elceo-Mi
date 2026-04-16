import { buildProviderGraph } from './adapters/build-provider-graph';
import { MarketIngestionPipeline } from './pipelines/marketIngestionPipeline';
import { MacroIngestionPipeline } from './pipelines/macroIngestionPipeline';
import { NewsIngestionPipeline } from './pipelines/newsIngestionPipeline';
import { GeopoliticsIngestionPipeline } from './pipelines/geopoliticsIngestionPipeline';
import { ExtractionIngestionPipeline } from './pipelines/extractionIngestionPipeline';
import { ConsoleKafkaPublisher } from './publishers/kafka-publisher';

export async function runIngestionTick(): Promise<void> {
  const providers = buildProviderGraph();
  const publisher = new ConsoleKafkaPublisher();

  const market = new MarketIngestionPipeline(providers.marketComposite, publisher);
  const macro = new MacroIngestionPipeline(providers.macroComposite, publisher);
  const news = new NewsIngestionPipeline(providers.newsComposite, publisher);
  const geopolitics = new GeopoliticsIngestionPipeline(providers.geopolitics, publisher);
  const extraction = new ExtractionIngestionPipeline(providers.extractionPrimary, providers.extractionFallback, publisher);

  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60_000).toISOString();
  const nowIso = now.toISOString();

  await Promise.all([
    market.ingestLatestQuote('XAU/USD'),
    macro.ingestWindow(tenMinutesAgo, nowIso),
    news.ingest('XAU/USD', tenMinutesAgo, nowIso),
    geopolitics.ingest('global risk', tenMinutesAgo, nowIso),
    extraction.ingest('https://www.federalreserve.gov/newsevents/pressreleases.htm')
  ]);
}
