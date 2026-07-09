import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

if (process.env.ELCEO_PROVIDER_STAGING_SMOKE !== '1') {
  console.error('provider staging smoke refused: set ELCEO_PROVIDER_STAGING_SMOKE=1');
  process.exit(2);
}
if (process.env.ELCEO_PROVIDER_ACTIVATION_MODE === 'production_live_allowed') {
  console.error('provider staging smoke refused: production activation is not approved');
  process.exit(2);
}
const provider = process.env.ELCEO_PROVIDER_SOURCE_ID ?? 'tiingo_market_data';
const capability = process.env.ELCEO_PROVIDER_CAPABILITY_ID ?? 'market_price_history';
const secretName = provider === 'fred' ? 'FRED_API_KEY' : provider === 'tiingo_market_data' ? 'TIINGO_API_KEY' : null;
if (provider === 'fred') {
  console.error('staging_live_not_implemented_for_provider:fred');
  process.exit(4);
}
if (provider !== 'tiingo_market_data') {
  console.error(`requires_manual_provider_review:${provider}`);
  process.exit(4);
}
if (secretName && !process.env[secretName]) {
  console.error(`credentials_unavailable:${provider}`);
  process.exit(3);
}
const require = createRequire(import.meta.url);
const gatePath = new URL('../services/reasoning/dist-test-cjs/services/reasoning/src/provider-sources/provider-api-gate.cjs', import.meta.url);
const validationPath = new URL('../services/reasoning/dist-test-cjs/services/reasoning/src/provider-sources/live-payload-validation.cjs', import.meta.url);
const tiingoPath = new URL('../services/reasoning/dist-test-cjs/services/reasoning/src/provider-sources/tiingo/tiingo-adapter.cjs', import.meta.url);
if (!existsSync(gatePath) || !existsSync(validationPath) || !existsSync(tiingoPath)) throw new Error('reasoning_cjs_build_missing_run_npm_run_w_elceo_reasoning_test_first');
const { executeProviderApiGateRequest } = require(fileURLToPath(gatePath));
const { buildCapturedPayloadContract, hashPayload } = require(fileURLToPath(validationPath));
const { TiingoMarketDataAdapter } = require(fileURLToPath(tiingoPath));
const fakeFetch = async () => ({ ok: true, status: 200, json: async () => ([{ date: '2026-01-01T00:00:00.000Z', open: 1.1, high: 1.2, low: 1, close: 1.15, volume: null }]) });
const adapter = new TiingoMarketDataAdapter({ mode: 'live_enabled', liveEnabled: true, apiKey: process.env[secretName], fetchImpl: process.env.ELCEO_PROVIDER_STAGING_SMOKE_FAKE_ADAPTER === '1' ? fakeFetch : undefined });
const requestId = `staging-smoke-${provider}-${Date.now()}`;
const result = await executeProviderApiGateRequest({ requestId, sourceId: provider, capabilityId: capability, asset: process.env.ELCEO_PROVIDER_ASSET ?? 'eur_usd', region: 'global', activationMode: 'staging_live_allowed', provenance: { actor: 'provider_staging_smoke', purpose: 'rc_h_staging_live_validation' }, policy: { explicitStagingLiveAllow: true, requestMetadata: { credentialPresent: true }, allowedNullableFields: ['volume'], allowUnknownFields: true } }, adapter);
if (!result.response || result.response.payloadSchemaStatus !== 'valid') {
  console.error(`staging_live_failed:${result.response?.error?.category ?? result.decision.reason}`);
  process.exit(5);
}
const captured = buildCapturedPayloadContract(result.response, { provider, capability, asset: process.env.ELCEO_PROVIDER_ASSET ?? 'eur_usd', mode: 'staging_live_allowed' });
const summary = { status: 'staging_live_validated', provider, capability, requestId, providerCallMode: result.decision.providerCallMode, responseId: result.response.responseId, recordCount: captured.recordCount, rawPayloadChecksum: captured.rawPayloadChecksum, normalizedPayloadChecksum: captured.normalizedPayloadChecksum, summaryChecksum: hashPayload({ provider, capability, requestId, rawPayloadChecksum: captured.rawPayloadChecksum, normalizedPayloadChecksum: captured.normalizedPayloadChecksum }), redactionProof: captured.redactionProof };
console.log(JSON.stringify(summary));
