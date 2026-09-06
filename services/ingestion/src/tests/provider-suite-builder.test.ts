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

  const credentials = { FINNHUB_API_KEY: 'sentinel', FMP_API_KEY: 'sentinel', ALPHAVANTAGE_API_KEY: 'sentinel', MARKETAUX_API_KEY: 'sentinel', NEWSAPI_API_KEY: 'sentinel', FIRECRAWL_API_KEY: 'sentinel', TIINGO_API_KEY: 'sentinel', FRED_API_KEY: 'sentinel' };
  for (const deployment of [{ APP_ENV: 'staging' }, { APP_ENV: 'production' }, { NODE_ENV: 'production' }]) {
    let constructed = 0;
    const deployedEnv = { ...credentials, ...deployment };
    const deployed = buildCanonicalProviderSuite(deployedEnv, { createFirecrawlExtractionAdapter: () => { constructed += 1; throw new Error('must_not_construct'); } });
    assert(Object.keys(deployed.suite).length === 0, 'production-like canonical suite must not expose unmanaged providers');
    assert(deployed.activeProviderCount === 0, 'credentials must not activate production-like legacy providers');
    assert(constructed === 0, 'production-like credentials must not construct network-capable adapters');
    const configured = getIngestionProviderConfig(deployedEnv);
    assert(configured.providers.every((provider) => !provider.enabled && provider.liveDisabled && !provider.stagingLiveAuthorized && !provider.stagingLiveValidated), 'production-like legacy readiness must remain live-disabled and unvalidated');
    assert(configured.providers.find((provider) => provider.providerName === 'finnhub')?.credentialPresent === true, 'credential presence must be reported separately');
    let graphDenied = false;
    try { buildProviderGraph(deployedEnv); } catch (error) { graphDenied = error instanceof Error && error.message === 'legacy_provider_graph_denied_in_deployed_runtime'; }
    assert(graphDenied, 'direct production-like provider graph must fail closed');
  }
  assert(Boolean(buildCanonicalProviderSuite({ ...credentials, APP_ENV: 'test', NODE_ENV: 'test' }).suite.marketData), 'explicit test runtime must retain adapter fixture behavior');
}
