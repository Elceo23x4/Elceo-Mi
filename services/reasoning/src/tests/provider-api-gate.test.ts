import assert from 'node:assert/strict';
import { TiingoMarketDataAdapter } from '../provider-sources/tiingo/tiingo-adapter.js';
import { buildProviderApiGateSnapshot, executeProviderApiGateRequest, redactProviderSecrets, resolveProviderRuntimeRequest, translateProviderCapability, validateProviderRuntimeResponse, type ProviderRuntimeRequest, type ProviderRuntimeResponse } from '../provider-sources/provider-api-gate.js';

const base = (overrides: Partial<ProviderRuntimeRequest> = {}): ProviderRuntimeRequest => ({
  requestId: 'req-1', sourceId: 'tiingo_market_data', capabilityId: 'market_price_history', asset: 'eur_usd',
  startAt: '2026-01-01T00:00:00.000Z', endAt: '2026-01-03T00:00:00.000Z', provenance: { actor: 'test', purpose: 'provider_gate_test' }, activationMode: 'dry_run', ...overrides
});

export async function runProviderApiGateTests(){
  const ti=translateProviderCapability('tiingo_market_data','market_price_history');
  assert.equal(ti.adapterId,'tiingo_market_data_market_price_history_adapter');
  assert.throws(()=>translateProviderCapability('tiingo_market_data','cot_report'),/source_capability_mismatch/);
  assert.equal(resolveProviderRuntimeRequest(base({ sourceId:'unknown' })).reason,'unknown_provider_source_id');
  assert.equal(resolveProviderRuntimeRequest(base({ capabilityId:'unknown_capability' as never })).reason,'source_capability_mismatch');
  assert.equal(resolveProviderRuntimeRequest(base({ sourceId:'tradingview_chart_metadata', capabilityId:'chart_presentation_metadata' as never, activationMode:'staging_live_allowed', policy:{ explicitStagingLiveAllow:true } })).reason,'descriptor_only_provider_cannot_execute');
  assert.equal(resolveProviderRuntimeRequest(base({ sourceId:'cftc_cot', capabilityId:'cot_report' as never, activationMode:'staging_live_allowed', policy:{ explicitStagingLiveAllow:true } })).reason,'fixture_only_provider_cannot_execute_live');
  assert.equal(resolveProviderRuntimeRequest(base()).providerCallMode,'dry_run_no_external_call');
  assert.equal(resolveProviderRuntimeRequest(base({ activationMode:'replay', idempotencyKey:'idem-1', replayPayload: response() })).providerCallMode,'replay_captured_payload');
  assert.equal(resolveProviderRuntimeRequest(base({ asset:null })).reason,'missing_asset');
  assert.equal(resolveProviderRuntimeRequest(base({ asset:'unsupported_asset' })).reason,'unsupported_asset');
  assert.equal(resolveProviderRuntimeRequest(base({ startAt:'2026-02-01T00:00:00.000Z', endAt:'2026-01-01T00:00:00.000Z' })).reason,'invalid_time_range');
  assert.equal(resolveProviderRuntimeRequest(base({ endAt:'2028-01-01T00:00:00.000Z', policy:{ maxWindowDays:10 } })).reason,'oversized_window');
  assert.equal(resolveProviderRuntimeRequest(base({ paginationCursor:'bad cursor !' })).reason,'invalid_pagination_cursor');
  assert.equal(resolveProviderRuntimeRequest(({ ...base(), provenance: undefined } as unknown as ProviderRuntimeRequest)).reason,'missing_provenance');
  assert.equal(resolveProviderRuntimeRequest(base({ activationMode:'live' as never })).reason,'unknown_activation_mode');
  assert.equal(resolveProviderRuntimeRequest(base({ activationMode:'production_live_allowed' })).reason,'production_live_requires_explicit_allow');
  assert.equal(resolveProviderRuntimeRequest(base({ metadata:{ providerCredential:'token sentinel should_not_emit' } })).reason,'secret_like_request_metadata');
  assert.equal(resolveProviderRuntimeRequest(base({ policy:{ quotaLimit:1, quotaUsed:1 } })).quotaStatus,'exceeded');
  assert.equal(resolveProviderRuntimeRequest(base({ policy:{ rateLimitRemaining:0 } })).rateLimitStatus,'exceeded');
  assert.equal(resolveProviderRuntimeRequest(base({ policy:{ costBudgetRemaining:0 } })).costStatus,'exceeded');
  assert.equal(resolveProviderRuntimeRequest(base({ policy:{ circuitState:'open' } })).reason,'circuit_open');
  assert.equal(resolveProviderRuntimeRequest(base({ policy:{ circuitState:'half_open' } })).allowed,true);

  const dry=await executeProviderApiGateRequest(base()); assert.equal(dry.response?.payloadSchemaStatus,'valid');
  const fixture=await executeProviderApiGateRequest(base({ activationMode:'fixture_only' }), new TiingoMarketDataAdapter({mode:'fixture'})); assert.equal(fixture.response?.sourceId,'tiingo_market_data');
  const replay=await executeProviderApiGateRequest(base({ activationMode:'replay', idempotencyKey:'idem-1', replayPayload: response({ responseId:'replay-1' }) })); assert.equal(replay.response?.responseId,'replay-1');
  const cache=await executeProviderApiGateRequest(base({ policy:{ cacheHitPayload: response({ responseId:'cache-1' }) } })); assert.equal(cache.decision.cacheStatus,'hit'); assert.equal(cache.response?.responseId,'cache-1');

  assert.throws(()=>validateProviderRuntimeResponse(response({ sourceId:'cftc_cot' }), resolveProviderRuntimeRequest(base())),/response_provenance_mismatch/);
  assert.throws(()=>validateProviderRuntimeResponse(response({ payloadSizeBytes:2_000_000 }), resolveProviderRuntimeRequest(base())),/oversized_response/);
  const valid=validateProviderRuntimeResponse(response({ payload:{ rows:[{providerId:'dup'},{providerId:'dup'}], optional:null, extra:'explicitly_allowed_in_gate_v1' }, duplicateProviderIds:['dup'], revision:'backfill-1', rateLimit:{remaining:3,resetAt:null} }), resolveProviderRuntimeRequest(base()));
  assert.deepEqual(valid.duplicateProviderIds,['dup']); assert.equal(valid.revision,'backfill-1'); assert.equal(valid.rateLimit?.remaining,3);
  const err=validateProviderRuntimeResponse(response({ payloadSchemaStatus:'provider_error', error:{ category:'provider_error', message:'redacted bearer token hidden' } }), resolveProviderRuntimeRequest(base()));
  assert.equal(err.error?.message,'[REDACTED]');
  const snap=buildProviderApiGateSnapshot(resolveProviderRuntimeRequest(base()), 'req-1', null, new Error('apiKey=secret'));
  assert.equal(JSON.stringify(snap).includes('secret'),false);
  const redacted=redactProviderSecrets({ authorization:'bearer sentinel abc', databaseUrl:'database url sentinel', nested:{ clientSecret:'x' }});
  assert.equal(JSON.stringify(redacted).includes('bearer sentinel'),false);
  assert.equal(JSON.stringify(redacted).includes('database url sentinel'),false);
}
function response(o: Partial<ProviderRuntimeResponse> = {}): ProviderRuntimeResponse { return { requestId:'req-1', responseId:'res-1', sourceId:'tiingo_market_data', capabilityId:'market_price_history', adapterId:'tiingo_market_data_market_price_history_adapter', receivedAt:'2026-01-01T00:00:00.000Z', payload:{ bars:[] }, payloadSchemaStatus:'valid', payloadSizeBytes:12, recordCount:0, provenance:{requestId:'req-1',sourceId:'tiingo_market_data'}, error:null, rateLimit:null, ...o }; }
