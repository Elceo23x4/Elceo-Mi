import {
  AlphaVantageMarketDataAdapter,
  FinnhubMacroCalendarAdapter,
  FinnhubMarketDataAdapter,
  FmpMacroCalendarAdapter,
  FmpMarketDataAdapter,
  MacroCalendarCompositeAdapter,
  MacroContextCompositeAdapter,
  MarketDataCompositeAdapter,
  MarketauxNewsAdapter,
  NewsApiNewsAdapter,
  NewsCompositeAdapter,
  InvestingCalendarScrapeAdapter,
  FirecrawlExtractionAdapter,
  GdeltEventAdapter,
  ImfMacroContextAdapter,
  OecdMacroContextAdapter,
  WorldBankMacroContextAdapter
} from '@elceo/providers';
import type { CanonicalProviderAdapterSuite } from '@elceo/types';
import { LegacyCalendarBridge, LegacyGeopoliticsBridge, LegacyMacroContextBridge, LegacyMarketEvidenceBridge, LegacyNewsBridge, type BridgeDiagnosticsSource } from '../bridges/index';
import { getIngestionProviderConfig, toProviderCapabilityDiagnostics, type IngestionProviderConfigSet } from './provider-config';
import { buildActiveProvidersByCategory, type ProviderCapabilityDiagnostic } from './provider-capabilities';

export type CanonicalProviderSuiteBuildResult = {
  suite: Partial<CanonicalProviderAdapterSuite>;
  providerCapabilities: ProviderCapabilityDiagnostic[];
  activeProvidersByCategory: Record<string, string[]>;
  activeProviderCount: number;
  bridgeDiagnosticsSources: BridgeDiagnosticsSource[];
};

export type CanonicalSuiteBuilderDependencies = {
  createFirecrawlExtractionAdapter?: (apiKey: string | undefined) => FirecrawlExtractionAdapter;
};

function markConstructionFailure(capabilities: ProviderCapabilityDiagnostic[], providerName: string): void {
  const item = capabilities.find((entry) => entry.providerName === providerName);
  if (!item) return;
  item.enabled = false;
  item.healthyToConstruct = false;
  item.reason = 'construction_failed';
}

function isEnabled(config: IngestionProviderConfigSet, providerName: string): boolean {
  return config.providers.some((item) => item.providerName === providerName && item.enabled);
}

export function buildCanonicalProviderSuite(
  rawEnv: Record<string, string | undefined>,
  dependencies: CanonicalSuiteBuilderDependencies = {}
): CanonicalProviderSuiteBuildResult {
  const config = getIngestionProviderConfig(rawEnv);
  const capabilities = toProviderCapabilityDiagnostics(config);
  const suite: Partial<CanonicalProviderAdapterSuite> = {};
  const bridgeDiagnosticsSources: BridgeDiagnosticsSource[] = [];
  const createFirecrawl = dependencies.createFirecrawlExtractionAdapter ?? ((apiKey) => new FirecrawlExtractionAdapter(apiKey));

  // 1) marketData
  try {
    const marketProviders: Record<string, FinnhubMarketDataAdapter | AlphaVantageMarketDataAdapter | FmpMarketDataAdapter> = {};
    if (isEnabled(config, 'finnhub')) marketProviders.finnhub = new FinnhubMarketDataAdapter(config.env.FINNHUB_API_KEY ?? '');
    if (isEnabled(config, 'alphavantage')) marketProviders.alphavantage = new AlphaVantageMarketDataAdapter(config.env.ALPHAVANTAGE_API_KEY ?? '');
    if (isEnabled(config, 'fmp')) marketProviders.fmp = new FmpMarketDataAdapter(config.env.FMP_API_KEY ?? '');

    if (Object.keys(marketProviders).length > 0) {
      const bridge = new LegacyMarketEvidenceBridge(new MarketDataCompositeAdapter(marketProviders));
      suite.marketData = bridge;
      bridgeDiagnosticsSources.push(bridge);
    } else {
      capabilities.push({ providerName: 'market-data-composite', category: 'market_data', enabled: false, healthyToConstruct: false, reason: 'no_adapter_registered' });
    }
  } catch {
    markConstructionFailure(capabilities, 'finnhub');
    markConstructionFailure(capabilities, 'alphavantage');
    markConstructionFailure(capabilities, 'fmp');
  }

  // 2) macroCalendar
  try {
    const macroProviders: Record<string, FinnhubMacroCalendarAdapter | FmpMacroCalendarAdapter | InvestingCalendarScrapeAdapter> = {};
    if (isEnabled(config, 'finnhub-calendar')) macroProviders.finnhub = new FinnhubMacroCalendarAdapter(config.env.FINNHUB_API_KEY ?? '');
    if (isEnabled(config, 'fmp-calendar')) macroProviders.fmp = new FmpMacroCalendarAdapter(config.env.FMP_API_KEY ?? '');
    if (isEnabled(config, 'investing-calendar-scrape')) {
      macroProviders['investing-firecrawl'] = new InvestingCalendarScrapeAdapter(createFirecrawl(config.env.FIRECRAWL_API_KEY));
    }

    if (Object.keys(macroProviders).length > 0) {
      const bridge = new LegacyCalendarBridge(new MacroCalendarCompositeAdapter(macroProviders));
      suite.macroCalendar = bridge;
      bridgeDiagnosticsSources.push(bridge);
    } else {
      capabilities.push({ providerName: 'macro-calendar-composite', category: 'macro_calendar', enabled: false, healthyToConstruct: false, reason: 'no_adapter_registered' });
    }
  } catch {
    markConstructionFailure(capabilities, 'finnhub-calendar');
    markConstructionFailure(capabilities, 'fmp-calendar');
    markConstructionFailure(capabilities, 'investing-calendar-scrape');
  }

  // 3) macroContext
  try {
    const contextProviders: Record<string, ImfMacroContextAdapter | WorldBankMacroContextAdapter | OecdMacroContextAdapter> = {};
    if (isEnabled(config, 'imf')) contextProviders.imf = new ImfMacroContextAdapter();
    if (isEnabled(config, 'worldbank')) contextProviders.worldbank = new WorldBankMacroContextAdapter();
    if (isEnabled(config, 'oecd')) contextProviders.oecd = new OecdMacroContextAdapter();

    if (Object.keys(contextProviders).length > 0) {
      const compositeContext = new MacroContextCompositeAdapter(contextProviders);
      const macroContextProvider = {
        providerId: 'macro-context-composite',
        getContext: async (countryCode: string) => compositeContext.getContext(countryCode)
      };
      const bridge = new LegacyMacroContextBridge(macroContextProvider);
      suite.macroContext = bridge;
      bridgeDiagnosticsSources.push(bridge);
    } else {
      capabilities.push({ providerName: 'macro-context-composite', category: 'macro_context', enabled: false, healthyToConstruct: false, reason: 'no_adapter_registered' });
    }
  } catch {
    markConstructionFailure(capabilities, 'imf');
    markConstructionFailure(capabilities, 'worldbank');
    markConstructionFailure(capabilities, 'oecd');
  }

  // 4) news
  try {
    const newsProviders: Record<string, MarketauxNewsAdapter | NewsApiNewsAdapter> = {};
    if (isEnabled(config, 'marketaux')) newsProviders.marketaux = new MarketauxNewsAdapter(config.env.MARKETAUX_API_KEY ?? '');
    if (isEnabled(config, 'newsapi')) newsProviders.newsapi = new NewsApiNewsAdapter(config.env.NEWSAPI_API_KEY ?? '');

    if (Object.keys(newsProviders).length > 0) {
      const bridge = new LegacyNewsBridge(new NewsCompositeAdapter(newsProviders));
      suite.news = bridge;
      bridgeDiagnosticsSources.push(bridge);
    } else {
      capabilities.push({ providerName: 'news-composite', category: 'news', enabled: false, healthyToConstruct: false, reason: 'no_adapter_registered' });
    }
  } catch {
    markConstructionFailure(capabilities, 'marketaux');
    markConstructionFailure(capabilities, 'newsapi');
  }

  // 5) geopolitics
  try {
    if (isEnabled(config, 'gdelt')) {
      const bridge = new LegacyGeopoliticsBridge(new GdeltEventAdapter());
      suite.geopolitics = bridge;
      bridgeDiagnosticsSources.push(bridge);
    } else {
      capabilities.push({ providerName: 'gdelt', category: 'geopolitics', enabled: false, healthyToConstruct: false, reason: 'provider_disabled_by_env' });
    }
  } catch {
    markConstructionFailure(capabilities, 'gdelt');
  }

  const activeProvidersByCategory = buildActiveProvidersByCategory(capabilities);
  const activeProviderCount = Object.values(activeProvidersByCategory).reduce((sum, values) => sum + values.length, 0);

  return {
    suite,
    providerCapabilities: capabilities,
    activeProvidersByCategory,
    activeProviderCount,
    bridgeDiagnosticsSources
  };
}
