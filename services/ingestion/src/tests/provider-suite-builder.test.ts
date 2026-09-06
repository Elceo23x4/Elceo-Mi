import { buildCanonicalProviderSuite } from '../facade/provider-suite-builder';
import { getIngestionProviderConfig } from '../facade/provider-config';
import { buildProviderGraph } from '../adapters/build-provider-graph';

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

  let constructed = 0;
  const stagingEnv = { APP_ENV: 'staging', FINNHUB_API_KEY: 'sentinel', FMP_API_KEY: 'sentinel', ALPHAVANTAGE_API_KEY: 'sentinel', MARKETAUX_API_KEY: 'sentinel', NEWSAPI_API_KEY: 'sentinel', FIRECRAWL_API_KEY: 'sentinel', TIINGO_API_KEY: 'sentinel', FRED_API_KEY: 'sentinel' };
  const staging = buildCanonicalProviderSuite(stagingEnv, { createFirecrawlExtractionAdapter: () => { constructed += 1; throw new Error('must_not_construct'); } });
  assert(Object.keys(staging.suite).length === 0, 'deployed canonical suite must not expose unmanaged providers');
  assert(staging.activeProviderCount === 0, 'credentials must not activate deployed legacy providers');
  assert(constructed === 0, 'deployed credentials must not construct network-capable adapters');
  const configured = getIngestionProviderConfig(stagingEnv);
  assert(configured.providers.every((provider) => !provider.enabled && provider.liveDisabled && !provider.stagingLiveAuthorized && !provider.stagingLiveValidated), 'staging legacy readiness must remain live-disabled and unvalidated');
  assert(configured.providers.find((provider) => provider.providerName === 'finnhub')?.credentialPresent === true, 'credential presence must be reported separately');
  let graphDenied = false;
  try { buildProviderGraph(stagingEnv); } catch (error) { graphDenied = error instanceof Error && error.message === 'legacy_provider_graph_denied_in_deployed_runtime'; }
  assert(graphDenied, 'direct deployed provider graph must fail closed');
}
