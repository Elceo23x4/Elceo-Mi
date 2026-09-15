import { readProviderEnv } from '@elceo/schemas';
import {
  FinnhubMacroCalendarAdapter,
  FinnhubMarketDataAdapter,
  FmpMacroCalendarAdapter,
  FmpMarketDataAdapter,
  MacroCalendarCompositeAdapter,
  MarketauxNewsAdapter,
  MarketDataCompositeAdapter,
  NewsCompositeAdapter,
  GdeltEventAdapter,
  FirecrawlExtractionAdapter,
  PlaywrightExtractionFallbackAdapter,
  ImfMacroContextAdapter,
  MacroContextCompositeAdapter,
  OecdMacroContextAdapter,
  WorldBankMacroContextAdapter
} from '@elceo/providers';

export function buildProviderGraph(rawEnv?: Record<string, string | undefined>) {
  const runtimeEnv = rawEnv ?? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  if (runtimeEnv.APP_ENV === 'staging' || runtimeEnv.APP_ENV === 'production' || runtimeEnv.NODE_ENV === 'production') {
    throw new Error('legacy_provider_graph_denied_in_deployed_runtime');
  }
  const env = readProviderEnv(runtimeEnv);

  const marketComposite = new MarketDataCompositeAdapter({
    finnhub: new FinnhubMarketDataAdapter(env.FINNHUB_API_KEY ?? ''),
    fmp: new FmpMarketDataAdapter(env.FMP_API_KEY ?? '')
  });

  const macroComposite = new MacroCalendarCompositeAdapter({
    finnhub: new FinnhubMacroCalendarAdapter(env.FINNHUB_API_KEY ?? ''),
    fmp: new FmpMacroCalendarAdapter(env.FMP_API_KEY ?? '')
  });

  const newsComposite = new NewsCompositeAdapter({
    marketaux: new MarketauxNewsAdapter(env.MARKETAUX_API_KEY ?? '')
  });

  const macroContextComposite = new MacroContextCompositeAdapter({
    imf: new ImfMacroContextAdapter(),
    worldbank: new WorldBankMacroContextAdapter(),
    oecd: new OecdMacroContextAdapter()
  });

  return {
    marketComposite,
    macroComposite,
    newsComposite,
    geopolitics: new GdeltEventAdapter(),
    // Firecrawl remains a generic extraction utility only; it is no longer a macro-calendar or news authority.
    extractionPrimary: new FirecrawlExtractionAdapter(env.FIRECRAWL_API_KEY),
    extractionFallback: new PlaywrightExtractionFallbackAdapter(),
    macroContextComposite
  };
}
