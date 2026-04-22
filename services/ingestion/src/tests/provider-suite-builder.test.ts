import { buildCanonicalProviderSuite } from '../facade/provider-suite-builder';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runProviderSuiteBuilderTests(): void {
  const enabled = buildCanonicalProviderSuite({
    FINNHUB_API_KEY: 'k',
    FMP_API_KEY: 'k',
    ALPHAVANTAGE_API_KEY: 'k',
    MARKETAUX_API_KEY: 'k',
    NEWSAPI_API_KEY: 'k',
    FIRECRAWL_API_KEY: 'k'
  });

  assert(Boolean(enabled.suite.marketData), 'marketData should be composed when keys are present');
  assert(Boolean(enabled.suite.macroCalendar), 'macroCalendar should be composed when keys are present');
  assert(Boolean(enabled.suite.news), 'news should be composed when keys are present');
  assert(Boolean(enabled.suite.macroContext), 'macroContext should be composed when no keys are required');
  assert(Boolean(enabled.suite.geopolitics), 'geopolitics should be composed by default');

  const keys = Object.keys(enabled.activeProvidersByCategory);
  assert(keys.join(',') === 'market_data,macro_calendar,macro_context,news,geopolitics', 'category order should be deterministic');

  const missing = buildCanonicalProviderSuite({});
  const finnhubCapability = missing.providerCapabilities.find((item) => item.providerName === 'finnhub');
  if (!finnhubCapability) throw new Error('Expected finnhub capability diagnostic');
  assert(finnhubCapability.enabled === false, 'missing key should disable provider');
  assert(finnhubCapability.reason === 'missing_api_key', 'missing key reason should be deterministic');
}
