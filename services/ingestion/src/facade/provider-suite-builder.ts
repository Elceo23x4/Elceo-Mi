import {
  FinnhubMacroCalendarAdapter,
  FinnhubMarketDataAdapter,
  FmpMacroCalendarAdapter,
  FmpMarketDataAdapter,
  MacroCalendarCompositeAdapter,
  MacroContextCompositeAdapter,
  MarketDataCompositeAdapter,
  MarketauxNewsAdapter,
  NewsCompositeAdapter,
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

export type CanonicalSuiteBuilderDependencies = Record<string, never>;

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
  _dependencies: CanonicalSuiteBuilderDependencies = {}
): CanonicalProviderSuiteBuildResult {
  const config = getIngestionProviderConfig(rawEnv);
  const capabilities = toProviderCapabilityDiagnostics(config);
  const suite: Partial<CanonicalProviderAdapterSuite> = {};
  const bridgeDiagnosticsSources: BridgeDiagnosticsSource[] = [];

  // Legacy/development compatibility only. Deployed runtimes are rejected in provider-config.
  // Market continuity is Finnhub -> FMP here; canonical deployed DFC uses Tiingo primary -> Finnhub fallback.
  try {
    const marketProviders: Record<string, FinnhubMarketDataAdapter | FmpMarketDataAdapter> = {};
    if (isEnabled(config, 'finnhub')) marketProviders.finnhub = new FinnhubMarketDataAdapter(config.env.FINNHUB_API_KEY ?? '');
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
    markConstructionFailure(capabilities, 'fmp');
  }

  try {
    const macroProviders: Record<string, FinnhubMacroCalendarAdapter | FmpMacroCalendarAdapter> = {};
    if (isEnabled(config, 'finnhub-calendar')) macroProviders.finnhub = new FinnhubMacroCalendarAdapter(config.env.FINNHUB_API_KEY ?? '');
    if (isEnabled(config, 'fmp-calendar')) macroProviders.fmp = new FmpMacroCalendarAdapter(config.env.FMP_API_KEY ?? '');

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
  }

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

  try {
    const newsProviders: Record<string, MarketauxNewsAdapter> = {};
    if (isEnabled(config, 'marketaux')) newsProviders.marketaux = new MarketauxNewsAdapter(config.env.MARKETAUX_API_KEY ?? '');

    if (Object.keys(newsProviders).length > 0) {
      const bridge = new LegacyNewsBridge(new NewsCompositeAdapter(newsProviders));
      suite.news = bridge;
      bridgeDiagnosticsSources.push(bridge);
    } else {
      capabilities.push({ providerName: 'news-composite', category: 'news', enabled: false, healthyToConstruct: false, reason: 'no_adapter_registered' });
    }
  } catch {
    markConstructionFailure(capabilities, 'marketaux');
  }

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
