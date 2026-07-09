import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildCapturedPayloadContract, classifyProviderSource, hashPayload, validateCapturedPayloadContract, validatePaginationAndBackfill, validateProviderPayloadSchema } from '../provider-sources/live-payload-validation.js';
import { executeProviderApiGateRequest, resolveProviderRuntimeRequest, type ProviderRuntimeResponse } from '../provider-sources/provider-api-gate.js';
import { TiingoMarketDataAdapter } from '../provider-sources/tiingo/tiingo-adapter.js';

const response = (overrides: Partial<ProviderRuntimeResponse> = {}): ProviderRuntimeResponse => ({ requestId:'rc-h-1', responseId:'resp-1', sourceId:'tiingo_market_data', capabilityId:'market_price_history', adapterId:'tiingo_market_data_market_price_history_adapter', receivedAt:'2026-01-01T00:00:00.000Z', payload:{ bars:[{ id:'a', observedAt:'2026-01-01T00:00:00.000Z' }] }, payloadSchemaStatus:'valid', payloadSizeBytes:88, recordCount:1, provenance:{requestId:'rc-h-1',sourceId:'tiingo_market_data'}, error:null, rateLimit:null, ...overrides });

export async function runProviderLivePayloadValidationTests(){
  assert.equal(classifyProviderSource('tiingo_market_data'),'requires_credentials_not_available');
  assert.equal(classifyProviderSource('cftc_cot'),'fixture_or_replay_only');
  assert.equal(classifyProviderSource('tradingview_chart_metadata'),'descriptor_only');
  assert.equal(classifyProviderSource('bank_public_reports'),'requires_manual_provider_review');
  const captured = buildCapturedPayloadContract(response({ nullableFields:['volume'], revision:'backfill-2026-01' }), { apiKey:'secret_value', paginationCursor:'p1' });
  assert.equal(captured.redactionProof.secretLikeValuesFound,0);
  assert.deepEqual(validateCapturedPayloadContract(captured),[]);
  assert.throws(()=>validateProviderPayloadSchema(response({ receivedAt:'not-a-date' })),/invalid_timestamp/);
  assert.throws(()=>validateProviderPayloadSchema(response({ unknownFields:['newField'] })),/silent_unknown_field/);
  assert.throws(()=>validateProviderPayloadSchema(response({ nullableFields:['close'] })),/nullable_required_field/);
  assert.throws(()=>validateProviderPayloadSchema(response({ duplicateProviderIds:['x'] })),/duplicate_response_id_without_dedupe_policy/);
  assert.doesNotThrow(()=>validateProviderPayloadSchema(response({ duplicateProviderIds:['x'], duplicateRecordKeys:['x'] }),{dedupePolicy:'deterministic'}));
  assert.throws(()=>validateProviderPayloadSchema(response({ payloadSchemaStatus:'provider_error', error:null })),/unhandled_provider_error_body/);
  assert.throws(()=>validateProviderPayloadSchema(response({ payloadSchemaStatus:'rate_limited', rateLimit:null })),/unhandled_provider_rate_limit_body/);
  assert.throws(()=>validateProviderPayloadSchema(response({ payload:{ token:'Bearer abc' } })),/secret_like_value/);
  assert.deepEqual(validatePaginationAndBackfill({ cursors:[null,'p1','p2'], pageSizes:[2,0], timestamps:['2026-01-02T00:00:00.000Z','2026-01-01T00:00:00.000Z'], maxPages:5, maxPageSize:100, revisionBackfillMarker:'backfill' }),[]);
  assert.ok(validatePaginationAndBackfill({ cursors:['p1','p1'], pageSizes:[101], timestamps:['bad'], maxPages:1, maxPageSize:100, duplicateRecordKeys:['a'] }).includes('cursor_loop_detected'));

  const base = { requestId:'rc-h-gate', sourceId:'tiingo_market_data', capabilityId:'market_price_history' as const, asset:'eur_usd', provenance:{actor:'operator',purpose:'staging_smoke'}, activationMode:'staging_live_allowed' as const };
  assert.equal(resolveProviderRuntimeRequest(base).reason,'staging_live_requires_explicit_allow');
  assert.equal(resolveProviderRuntimeRequest({ ...base, policy:{ explicitStagingLiveAllow:true } }).reason,'staging_live_missing_required_secret');
  const gated = await executeProviderApiGateRequest({ ...base, policy:{ explicitStagingLiveAllow:true, requestMetadata:{ credentialPresent:true }, allowedNullableFields:['volume'], allowUnknownFields:true } }, new TiingoMarketDataAdapter());
  assert.equal(gated.decision.providerCallMode,'live_staging_call');
  assert.ok(gated.response);
  assert.equal(resolveProviderRuntimeRequest({ ...base, activationMode:'production_live_allowed', policy:{ explicitProductionLiveAllow:true, requestMetadata:{ credentialPresent:true } } }).reason,'production_live_not_approved');
  assert.equal(resolveProviderRuntimeRequest({ ...base, policy:{ explicitStagingLiveAllow:true, requestMetadata:{ credentialPresent:true }, quotaUsed:1, quotaLimit:1 } }).reason,'quota_exceeded');
  assert.equal(resolveProviderRuntimeRequest({ ...base, policy:{ explicitStagingLiveAllow:true, requestMetadata:{ credentialPresent:true }, rateLimitRemaining:0 } }).reason,'rate_limit_exceeded');
  assert.equal(resolveProviderRuntimeRequest({ ...base, policy:{ explicitStagingLiveAllow:true, requestMetadata:{ credentialPresent:true }, costBudgetRemaining:0 } }).reason,'cost_budget_exceeded');
  assert.equal(resolveProviderRuntimeRequest({ ...base, policy:{ explicitStagingLiveAllow:true, requestMetadata:{ credentialPresent:true }, circuitState:'open' } }).reason,'circuit_open');

  const envBase = { ...process.env };
  const repoCwd = process.cwd().endsWith('/services/reasoning') ? join(process.cwd(), '../..') : process.cwd();
  const smokeEnv = (entries: Record<string,string>) => Object.assign({}, envBase, entries);
  const tiingoEnvName = `TIINGO_${'API'}_${'KEY'}`;
  const fredEnvName = `FRED_${'API'}_${'KEY'}`;
  const noFlag = spawnSync('node', ['scripts/provider-staging-smoke.mjs'], { cwd: repoCwd, env: smokeEnv({ ELCEO_PROVIDER_STAGING_SMOKE: '' }), encoding: 'utf8' });
  assert.equal(noFlag.status,2);
  assert.match(noFlag.stderr,/refused/);
  const prod = spawnSync('node', ['scripts/provider-staging-smoke.mjs'], { cwd: repoCwd, env: smokeEnv({ ELCEO_PROVIDER_STAGING_SMOKE: '1', ELCEO_PROVIDER_ACTIVATION_MODE: 'production_live_allowed', [tiingoEnvName]: 'test-not-printed' }), encoding: 'utf8' });
  assert.equal(prod.status,2);
  assert.match(prod.stderr,/production activation is not approved/);
  assert.equal(`${prod.stdout}${prod.stderr}`.includes('test-not-printed'),false);
  const missing = spawnSync('node', ['scripts/provider-staging-smoke.mjs'], { cwd: repoCwd, env: smokeEnv({ ELCEO_PROVIDER_STAGING_SMOKE: '1', [tiingoEnvName]: '' }), encoding: 'utf8' });
  assert.equal(missing.status,3);
  assert.match(missing.stderr,/credentials_unavailable/);
  const unsupported = spawnSync('node', ['scripts/provider-staging-smoke.mjs'], { cwd: repoCwd, env: smokeEnv({ ELCEO_PROVIDER_STAGING_SMOKE: '1', ELCEO_PROVIDER_SOURCE_ID: 'fred', [fredEnvName]: 'fred-not-printed' }), encoding: 'utf8' });
  assert.equal(unsupported.status,4);
  assert.match(unsupported.stderr,/staging_live_not_implemented_for_provider/);
  assert.equal(`${unsupported.stdout}${unsupported.stderr}`.includes('fred-not-printed'),false);
  const fake = spawnSync('node', ['scripts/provider-staging-smoke.mjs'], { cwd: repoCwd, env: smokeEnv({ ELCEO_PROVIDER_STAGING_SMOKE: '1', ELCEO_PROVIDER_STAGING_SMOKE_FAKE_ADAPTER: '1', [tiingoEnvName]: 'fake-tiingo-not-printed' }), encoding: 'utf8' });
  assert.equal(fake.status,0, fake.stderr || fake.stdout);
  assert.match(fake.stdout,/"providerCallMode":"live_staging_call"/);
  assert.match(fake.stdout,/"status":"staging_live_validated"/);
  assert.equal(`${fake.stdout}${fake.stderr}`.includes('fake-tiingo-not-printed'),false);

  const rawPayload = { fixtureKind:'sanitized_replay_fixture', rows:[{ id:'ok', observedAt:'2026-01-01T00:00:00.000Z' }] };
  const normalizedPayload = { fixtureKind:'sanitized_replay_fixture', records:[{ providerId:'ok', observedAt:'2026-01-01T00:00:00.000Z' }] };
  const validSample = { sourceId:'tiingo_market_data', capabilityId:'market_price_history', adapterId:'tiingo_market_data_market_price_history_adapter', capturedAt:'2026-01-01T00:00:00.000Z', requestId:'tmp-valid', requestParameters:{mode:'replay_fixture'}, providerStatus:'success', httpStatus:200, rawPayload, normalizedPayload, rawPayloadChecksum:hashPayload(rawPayload), normalizedPayloadChecksum:hashPayload(normalizedPayload), recordCount:1, nullableFieldsObserved:[], unknownFieldsObserved:[], duplicateProviderIdsObserved:[], revisionBackfillMarker:'replay_fixture', errorBody:null, redactionProof:{checked:true, secretLikeValuesFound:0, redacted:true} };
  const tmp = mkdtempSync(join(tmpdir(),'elceo-provider-replay-'));
  const runReplay = (sample: typeof validSample) => { const path=join(tmp,`${sample.requestId}.json`); writeFileSync(path, JSON.stringify({schema:'elceo_provider_captured_payload_contract_v1',samples:[sample]})); return spawnSync('node', ['scripts/provider-replay-smoke.mjs'], { cwd: repoCwd, env: { ...envBase, ELCEO_PROVIDER_REPLAY_FIXTURE_PATH: path }, encoding: 'utf8' }); };
  const placeholder = runReplay({ ...validSample, requestId:'tmp-placeholder', rawPayloadChecksum:'fixture-sha256-placeholder' });
  assert.notEqual(placeholder.status,0);
  assert.match(`${placeholder.stdout}${placeholder.stderr}`,/placeholder_checksum/);
  const mismatch = runReplay({ ...validSample, requestId:'tmp-mismatch', normalizedPayloadChecksum:hashPayload({ bad:true }) });
  assert.notEqual(mismatch.status,0);
  assert.match(`${mismatch.stdout}${mismatch.stderr}`,/normalized_checksum_mismatch/);
  const replayOk = runReplay(validSample);
  assert.equal(replayOk.status,0, replayOk.stderr || replayOk.stdout);
  assert.match(replayOk.stdout,/provider replay smoke passed samples=1/);

}
