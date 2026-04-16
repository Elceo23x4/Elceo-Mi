import { readProviderEnv } from '@elceo/schemas';
import {
  AlphaVantageMarketDataAdapter,
  FinnhubMacroCalendarAdapter,
  FinnhubMarketDataAdapter,
  FmpMacroCalendarAdapter,
  FmpMarketDataAdapter,
  MacroCalendarCompositeAdapter,
  MarketauxNewsAdapter,
  MarketDataCompositeAdapter,
  NewsApiNewsAdapter,
  NewsCompositeAdapter,
  InvestingCalendarScrapeAdapter,
  GdeltEventAdapter,
  FirecrawlExtractionAdapter,
  PlaywrightExtractionFallbackAdapter,
  ImfMacroContextAdapter,
  MacroContextCompositeAdapter,
  OecdMacroContextAdapter,
  WorldBankMacroContextAdapter
} from '@elceo/providers';

export function buildProviderGraph() {
  const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const env = readProviderEnv(runtimeEnv);

  const marketComposite = new MarketDataCompositeAdapter({
    finnhub: new FinnhubMarketDataAdapter(env.FINNHUB_API_KEY ?? ''),
    alphavantage: new AlphaVantageMarketDataAdapter(env.ALPHAVANTAGE_API_KEY ?? ''),
    fmp: new FmpMarketDataAdapter(env.FMP_API_KEY ?? '')
  });

  const macroComposite = new MacroCalendarCompositeAdapter({
    finnhub: new FinnhubMacroCalendarAdapter(env.FINNHUB_API_KEY ?? ''),
    'investing-firecrawl': new InvestingCalendarScrapeAdapter(),
    fmp: new FmpMacroCalendarAdapter(env.FMP_API_KEY ?? '')
  });

  const newsComposite = new NewsCompositeAdapter({
    marketaux: new MarketauxNewsAdapter(env.MARKETAUX_API_KEY ?? ''),
    newsapi: new NewsApiNewsAdapter(env.NEWSAPI_API_KEY ?? '')
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
    extractionPrimary: new FirecrawlExtractionAdapter(),
    extractionFallback: new PlaywrightExtractionFallbackAdapter(),
    macroContextComposite
  };
}
