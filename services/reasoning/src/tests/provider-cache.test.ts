import assert from 'node:assert/strict';
import { TiingoMarketDataAdapter } from '../provider-sources/tiingo/tiingo-adapter.js';
import {
  assertProviderCachePolicyAuthority,
  buildProviderCacheIdentity,
  hashProviderCachePolicy,
  hashProviderCachedMaterial,
  ProviderCacheCoordinator,
  ProviderL1Cache,
  responseFromMaterial,
  sanitizeProviderSharedFailureReason,
  validateProviderCacheControlLeaseInvariant,
  type ProviderCacheEntry,
  type ProviderCacheIdentity,
  type ProviderCachePolicy,
  type ProviderCacheRead,
  type ProviderCacheStore,
  type ProviderCachedMaterial,
  type ProviderFlightState,
  type ProviderSharedFailureReason,
} from '../provider-sources/provider-cache/index.js';
import { executeProviderApiGateRequest, type ProviderRuntimeRequest, type ProviderRuntimeResponse } from '../provider-sources/provider-api-gate.js';
import { buildProviderRequestFingerprint, MemoryProviderControlStore, type ProviderControlStore } from '../provider-sources/provider-control/index.js';
import { buildTestProviderControlPolicy } from './provider-control.test.js';
import { MemoryProviderResilienceStore, type ProviderProbeLease, type ProviderResilienceOutcome, type ProviderResiliencePolicy, type ProviderResilienceStore } from '../provider-sources/provider-resilience/index.js';
import { buildTestProviderResiliencePolicy } from './provider-resilience.test.js';

class TestRedisResilienceStore implements ProviderResilienceStore {
  readonly kind = 'redis' as const;
  private readonly delegate = new MemoryProviderResilienceStore();
  isReady(): boolean { return true; }
  acquire(policy: ProviderResiliencePolicy, ownerToken: string) { return this.delegate.acquire(policy, ownerToken); }
  observe(policy: ProviderResiliencePolicy, outcome: ProviderResilienceOutcome, probe?: ProviderProbeLease) { return this.delegate.observe(policy, outcome, probe); }
  releaseProbe(policy: ProviderResiliencePolicy, probe: ProviderProbeLease) { return this.delegate.releaseProbe(policy, probe); }
  close(): Promise<void> { return Promise.resolve(); }
}

export function buildTestProviderCachePolicy(
  overrides: Partial<ProviderCachePolicy> = {},
): ProviderCachePolicy {
  const unsigned: Omit<ProviderCachePolicy, 'canonicalPolicyHash'> = {
    policyId: 'synthetic-pgs2',
    policyVersion: '1',
    status: 'approved',
    sourceId: 'tiingo_market_data',
    capabilityId: 'market_price_history',
    credentialPoolId: 'primary',
    effectiveFrom: '1970-01-01T00:00:00.000Z',
    effectiveTo: null,
    provenance: 'synthetic test policy only',
    freshTtlMs: 5_000,
    staleIfErrorTtlMs: 5_000,
    flightLeaseMs: 6_000,
    followerWaitTimeoutMs: 8_000,
    completionTtlMs: 500,
    maxEntryBytes: 1_048_576,
    ...overrides,
  };
  return { ...unsigned, canonicalPolicyHash: hashProviderCachePolicy(unsigned) };
}

class TestCacheStore implements ProviderCacheStore {
  readonly kind = 'redis' as const;
  entry: ProviderCacheEntry | undefined;
  token: string | undefined;
  completion: ProviderFlightState['completion'];
  publishAttempts = 0;
  publishedBytes = 0;
  async read(_identity: ProviderCacheIdentity, _policy: ProviderCachePolicy): Promise<ProviderCacheRead> {
    if (!this.entry) return { state: 'MISS' };
    const now = Date.now();
    if (now > this.entry.staleUntil) return { state: 'MISS' };
    return { state: now <= this.entry.freshUntil ? 'FRESH' : 'STALE_BUT_ELIGIBLE', entry: this.entry };
  }
  async tryAcquireFlight(_identity: ProviderCacheIdentity, token: string): Promise<boolean> {
    if (this.token) return false;
    this.token = token;
    this.completion = undefined;
    return true;
  }
  async renewFlight(_identity: ProviderCacheIdentity, token: string): Promise<boolean> {
    return this.token === token;
  }
  async readFlightState(): Promise<ProviderFlightState> {
    return { active: Boolean(this.token), ...(this.completion ? { completion: this.completion } : {}) };
  }
  async publishSuccessAndComplete(
    _identity: ProviderCacheIdentity,
    token: string,
    material: ProviderCachedMaterial,
    policy: ProviderCachePolicy,
  ) {
    this.publishAttempts += 1;
    if (this.token !== token) return { published: false as const, reason: 'provider_singleflight_ownership_lost' as const };
    const now = Date.now();
    const entry: ProviderCacheEntry = { entrySchemaVersion: 'provider_cache_entry_v1', publishedAt: now, freshUntil: now + policy.freshTtlMs, staleUntil: now + policy.freshTtlMs + policy.staleIfErrorTtlMs, material };
    this.publishedBytes = Buffer.byteLength(JSON.stringify(entry));
    if (this.publishedBytes > policy.maxEntryBytes) {
      this.token = undefined;
      return { published: false as const, reason: 'provider_cache_entry_too_large' as const };
    }
    this.entry = entry;
    this.token = undefined;
    return { published: true as const, entry };
  }
  async publishFailureAndComplete(
    _identity: ProviderCacheIdentity,
    token: string,
    reason: ProviderSharedFailureReason,
  ): Promise<boolean> {
    if (this.token !== token) return false;
    this.completion = { state: 'failure', reason, completedAt: Date.now() };
    this.token = undefined;
    return true;
  }
  async releaseOwnerSafely(_identity: ProviderCacheIdentity, token: string): Promise<boolean> {
    if (this.token !== token) return false;
    this.token = undefined;
    return true;
  }
}

function liveRequest(requestId: string, policy: Partial<ProviderRuntimeRequest['policy']> = {}): ProviderRuntimeRequest {
  return {
    requestId,
    sourceId: 'tiingo_market_data',
    capabilityId: 'market_price_history',
    asset: 'eur_usd',
    activationMode: 'staging_live_allowed',
    provenance: { actor: 'test', purpose: 'pgs2_acceptance' },
    policy: { explicitStagingLiveAllow: true, requestMetadata: { credentialPresent: true }, ...policy },
  };
}

function compatibilityResponse(requestId: string, marker: string): ProviderRuntimeResponse {
  return {
    requestId,
    responseId: `untrusted-${requestId}`,
    sourceId: 'tiingo_market_data',
    capabilityId: 'market_price_history',
    adapterId: 'tiingo_market_data_market_price_history_adapter',
    receivedAt: '2026-01-01T00:00:00.000Z',
    payload: { marker },
    payloadSchemaStatus: 'valid',
    payloadSizeBytes: 20,
    recordCount: 1,
    provenance: { requestId, sourceId: 'tiingo_market_data' },
  };
}

export async function runProviderCacheTests(): Promise<void> {
  const policy = buildTestProviderCachePolicy();
  assertProviderCachePolicyAuthority(policy, { sourceId: policy.sourceId, capabilityId: policy.capabilityId }, 'primary');
  for (const bad of [buildTestProviderCachePolicy({ status: 'test_only' }), buildTestProviderCachePolicy({ status: 'disabled' })]) {
    assert.throws(() => assertProviderCachePolicyAuthority(bad, { sourceId: policy.sourceId, capabilityId: policy.capabilityId }, 'primary'), /not_approved/);
  }
  assert.throws(() => assertProviderCachePolicyAuthority(policy, { sourceId: 'fred', capabilityId: policy.capabilityId }, 'primary'), /scope_mismatch/);
  assert.throws(() => assertProviderCachePolicyAuthority({ ...policy, canonicalPolicyHash: 'bad' }, { sourceId: policy.sourceId, capabilityId: policy.capabilityId }, 'primary'), /hash_mismatch/);
  assert.throws(() => assertProviderCachePolicyAuthority(buildTestProviderCachePolicy({ flightLeaseMs: 1 }), { sourceId: policy.sourceId, capabilityId: policy.capabilityId }, 'primary'), /out_of_bounds/);

  const request = liveRequest('leader');
  const fingerprint = 'v1:sha256:fingerprint';
  const identity = buildProviderCacheIdentity(request, policy, 'primary', fingerprint);
  assert.equal(identity.hash, buildProviderCacheIdentity(liveRequest('follower'), policy, 'primary', fingerprint).hash);
  assert.notEqual(identity.hash, buildProviderCacheIdentity(request, buildTestProviderCachePolicy({ credentialPoolId: 'secondary' }), 'secondary', fingerprint).hash);

  const l1 = new ProviderL1Cache(1, 200_000);
  const now = Date.now();
  const invalidEntry: ProviderCacheEntry = { entrySchemaVersion: 'provider_cache_entry_v1', publishedAt: now, freshUntil: now + 1_000, staleUntil: now + 2_000, material: { cacheSchemaVersion: 'provider_cached_material_v1', sourceId: policy.sourceId, capabilityId: 'market_price_history', adapterId: 'tiingo_market_data_market_price_history_adapter', fingerprint, receivedAt: new Date().toISOString(), payload: { ok: true }, payloadSizeBytes: 11, recordCount: 1, cachePolicyVersion: policy.policyVersion, cachePolicyHash: policy.canonicalPolicyHash, materialIntegrityHash: 'invalid' } };
  l1.set(identity, invalidEntry, policy);
  assert.equal(l1.get(identity, policy), undefined);
  assert.equal(l1.size, 0);

  const controlPolicy = buildTestProviderControlPolicy({ concurrency: { maxConcurrent: 2, leaseDurationMs: 2_000, providerTimeoutMs: 500 } });
  assert.doesNotThrow(() => validateProviderCacheControlLeaseInvariant(buildTestProviderCachePolicy({ flightLeaseMs: 1_100 }), controlPolicy));
  assert.throws(() => validateProviderCacheControlLeaseInvariant(buildTestProviderCachePolicy({ flightLeaseMs: 900 }), controlPolicy), /lease_invariant/);
  assert.equal(sanitizeProviderSharedFailureReason('Bearer sk_live_secret'), 'provider_error');

  const cacheStore = new TestCacheStore();
  const coordinator = new ProviderCacheCoordinator(cacheStore);
  const memoryControl = new MemoryProviderControlStore();
  let admits = 0;
  let claims = 0;
  const controlStore: ProviderControlStore = {
    kind: 'redis',
    isReady: () => true,
    admit: async (admission) => { admits += 1; return memoryControl.admit(admission); },
    claimExecution: async (reservation, token) => { claims += 1; return memoryControl.claimExecution(reservation, token); },
    settle: (reservation, status) => memoryControl.settle(reservation, status),
    close: () => memoryControl.close(),
  };
  const fixture = new TiingoMarketDataAdapter({ mode: 'fixture' });
  let adapterCalls = 0;
  const adapter = {
    descriptor: fixture.descriptor,
    fetch: async () => { throw new Error('unmanaged_fetch_forbidden'); },
    fetchManaged: async (sourceRequest: never) => { adapterCalls += 1; await new Promise((resolve) => setTimeout(resolve, 20)); return fixture.fetch(sourceRequest); },
    normalize: async () => [],
  };
  const resiliencePolicy = buildTestProviderResiliencePolicy();
  const context = { cacheCoordinator: coordinator, cachePolicyResolver: { resolve: async () => policy }, providerControlStore: controlStore, policyResolver: { resolve: async () => controlPolicy }, resilienceStore: new TestRedisResilienceStore(), resiliencePolicyResolver: { resolve: async () => resiliencePolicy }, credentialPoolId: 'primary' };
  const poisoned = liveRequest('caller-0', { cacheHitPayload: compatibilityResponse('caller-0', 'poison'), stalePayload: compatibilityResponse('caller-0', 'stale-poison'), fallbackMode: 'stale_if_error' });
  const poisonedResult = await executeProviderApiGateRequest(poisoned, adapter, context);
  assert.equal(poisonedResult.decision.providerCallMode, 'live_staging_call', 'publishing owner remains a truthful live call');
  assert.equal(poisonedResult.settlementState, 'settled_committed');
  assert.ok(poisonedResult.providerControlSnapshot);
  assert.equal(poisonedResult.cacheSnapshot?.singleFlightRole, 'owner');
  assert.equal(poisonedResult.cacheSnapshot?.singleFlightOutcome, 'published');
  assert.equal(JSON.stringify(poisonedResult.response?.payload).includes('poison'), false);
  assert.ok(cacheStore.entry, `real provider success must publish cache: ${poisonedResult.decision.reason}/${poisonedResult.settlementState}/attempts=${cacheStore.publishAttempts}/bytes=${cacheStore.publishedBytes}/completion=${cacheStore.completion?.reason}`);
  const cachedResult = await executeProviderApiGateRequest(liveRequest('caller-cache-check'), adapter, context);
  assert.equal(JSON.stringify(cachedResult.response?.payload).includes('poison'), false);
  assert.equal(adapterCalls, 1, 'live compatibility payload must not cause a second adapter call');
  assert.equal(cachedResult.decision.providerCallMode, 'cache_response');
  assert.equal(cachedResult.settlementState, 'not_required');
  assert.equal(cachedResult.providerControlSnapshot, undefined);

  const resolverSecret = 'Bearer sk_live_resolver_secret';
  const resolverFailure = await executeProviderApiGateRequest(liveRequest('resolver-error'), adapter, {
    ...context,
    cachePolicyResolver: { resolve: async () => { throw new Error(resolverSecret); } },
  });
  assert.equal(resolverFailure.decision.reason, 'provider_cache_policy_missing');
  assert.equal(resolverFailure.decision.providerCallMode, 'blocked_live');
  assert.equal(resolverFailure.settlementState, 'not_required');
  assert.equal(JSON.stringify(resolverFailure).includes(resolverSecret), false);
  const resilienceResolverSecret = 'provider_resilience_policy_Bearer sk_live_should_not_escape';
  const resilienceResolverFailure = await executeProviderApiGateRequest(liveRequest('resilience-resolver-error'), adapter, {
    ...context,
    cacheCoordinator: new ProviderCacheCoordinator(new TestCacheStore()),
    resiliencePolicyResolver: { resolve: async () => { throw new Error(resilienceResolverSecret); } },
  });
  assert.equal(resilienceResolverFailure.decision.reason, 'provider_resilience_policy_missing');
  assert.equal(resilienceResolverFailure.decision.providerCallMode, 'blocked_live');
  assert.equal(resilienceResolverFailure.settlementState, 'not_required');
  assert.equal(JSON.stringify(resilienceResolverFailure).includes('sk_live_should_not_escape'), false);

  const responses = await Promise.all(Array.from({ length: 1_000 }, (_, index) => executeProviderApiGateRequest(liveRequest(`wave-${index}`), adapter, context)));
  assert.equal(adapterCalls, 1, 'same-process wave adapter count');
  assert.equal(admits, 1, 'same-process wave PGS-1 admission count');
  assert.equal(claims, 1, 'same-process wave PGS-1 claim count');
  for (let index = 0; index < responses.length; index += 1) {
    assert.equal(responses[index]!.response?.requestId, `wave-${index}`);
    assert.equal(responses[index]!.response?.provenance.requestId, `wave-${index}`);
  }
  assert.equal(coordinator.localInflightSize, 0);

  const material = cacheStore.entry!.material;
  const rematerialized = responseFromMaterial(material, liveRequest('semantic-equivalence'));
  assert.equal(rematerialized.revision, material.revision);
  assert.deepEqual(rematerialized.duplicateProviderIds, material.duplicateProviderIds);
  assert.deepEqual(rematerialized.duplicateRecordKeys, material.duplicateRecordKeys);

  // Cached material is revalidated for each caller rather than inheriting the
  // leader's validation choices.
  const validationRequest = { ...liveRequest('validation-reader', { allowUnknownFields: true, allowedNullableFields: ['optional'], dedupeRecordKey: 'id' }), region: 'validation' };
  const validationIdentity = buildProviderCacheIdentity(validationRequest, policy, 'primary', buildProviderRequestFingerprint(validationRequest));
  const baseValidationMaterial = Object.fromEntries(Object.entries(material).filter(([key]) => key !== 'materialIntegrityHash')) as Omit<ProviderCachedMaterial, 'materialIntegrityHash'>;
  const validationUnsigned = { ...baseValidationMaterial, fingerprint: validationIdentity.fingerprint, payload: { records: [{ id: 'same' }, { id: 'same' }] }, payloadSizeBytes: 41, recordCount: 2, unknownFields: ['test-field'], nullableFields: ['optional'], duplicateRecordKeys: [] };
  const validationMaterial = { ...validationUnsigned, materialIntegrityHash: hashProviderCachedMaterial(validationUnsigned) } as ProviderCachedMaterial;
  const validationNow = Date.now();
  const validationStore = new TestCacheStore();
  validationStore.entry = { entrySchemaVersion: 'provider_cache_entry_v1', publishedAt: validationNow, freshUntil: validationNow + 5_000, staleUntil: validationNow + 10_000, material: validationMaterial };
  const validationContext = { ...context, cacheCoordinator: new ProviderCacheCoordinator(validationStore) };
  const compatible = await executeProviderApiGateRequest(validationRequest, adapter, validationContext);
  assert.deepEqual(compatible.response?.duplicateRecordKeys, ['same']);
  await assert.rejects(
    () => executeProviderApiGateRequest({ ...validationRequest, requestId: 'validation-strict', policy: { ...validationRequest.policy, allowUnknownFields: false } }, adapter, validationContext),
    /unknown_response_fields/,
  );
  await assert.rejects(
    () => executeProviderApiGateRequest({ ...validationRequest, requestId: 'validation-nullable', policy: { ...validationRequest.policy, allowedNullableFields: [] } }, adapter, validationContext),
    /nullable_field_not_allowed/,
  );

  const timeoutStore = new TestCacheStore();
  timeoutStore.entry = { ...cacheStore.entry!, freshUntil: Date.now() - 1, staleUntil: Date.now() + 5_000 };
  timeoutStore.token = 'healthy-owner';
  let timeoutOwnerCalls = 0;
  const timeoutOutcome = await new ProviderCacheCoordinator(timeoutStore).execute(
    liveRequest('follower-timeout'),
    identity,
    buildTestProviderCachePolicy({ followerWaitTimeoutMs: 100, completionTtlMs: 50 }),
    async () => { timeoutOwnerCalls += 1; throw new Error('must_not_execute'); },
  );
  assert.equal(timeoutOutcome.failureReason, 'provider_singleflight_wait_timeout');
  assert.equal(timeoutOutcome.material, undefined, 'active-owner timeout must not serve stale');
  assert.equal(timeoutOwnerCalls, 0);

  const runNonCacheableCase = async (
    name: string,
    fetchManaged: typeof adapter.fetchManaged,
    settleConfirmed = true,
  ) => {
    const caseCache = new TestCacheStore();
    const caseControl = new MemoryProviderControlStore();
    const caseStore: ProviderControlStore = {
      kind: 'redis',
      isReady: () => true,
      admit: (admission) => caseControl.admit(admission),
      claimExecution: (reservation, token) => caseControl.claimExecution(reservation, token),
      settle: async (reservation, status) =>
        settleConfirmed ? caseControl.settle(reservation, status) : false,
      close: () => caseControl.close(),
    };
    const result = await executeProviderApiGateRequest(
      { ...liveRequest(`non-cacheable-${name}`), region: name },
      { ...adapter, fetchManaged },
      {
        cacheCoordinator: new ProviderCacheCoordinator(caseCache),
        cachePolicyResolver: { resolve: async () => policy },
        providerControlStore: caseStore,
        policyResolver: { resolve: async () => controlPolicy },
        resilienceStore: new TestRedisResilienceStore(),
        resiliencePolicyResolver: { resolve: async () => resiliencePolicy },
        credentialPoolId: 'primary',
      },
    );
    assert.equal(caseCache.entry, undefined, `${name} must not publish healthy cache`);
    assert.equal(caseCache.publishAttempts, 0, `${name} must not attempt success publication`);
    return { result, caseCache };
  };

  const invalid = await runNonCacheableCase('invalid-response', async (sourceRequest: never) => {
    const providerResponse = await fixture.fetch(sourceRequest);
    return { ...providerResponse, rawPayloadJson: JSON.stringify({ value: 'x'.repeat(1_048_577) }) };
  });
  assert.equal(invalid.result.decision.reason, 'provider_validation_failed');

  const providerError = await runNonCacheableCase('provider-error', async (sourceRequest: never) => {
    const providerResponse = await fixture.fetch(sourceRequest);
    return { ...providerResponse, status: 'failed' as const, errorCode: 'provider_error', errorMessage: 'temporary provider failure', rawPayloadJson: null };
  });
  assert.equal(providerError.caseCache.completion?.reason, 'provider_error');

  const rateLimited = await runNonCacheableCase('rate-limited', async (sourceRequest: never) => {
    const providerResponse = await fixture.fetch(sourceRequest);
    return { ...providerResponse, status: 'failed' as const, errorCode: 'rate_limited', errorMessage: 'rate limited', rawPayloadJson: null };
  });
  assert.equal(rateLimited.caseCache.completion?.reason, 'provider_rate_limited');

  const unconfirmed = await runNonCacheableCase(
    'settlement-unconfirmed',
    async (sourceRequest: never) => fixture.fetch(sourceRequest),
    false,
  );
  assert.equal(unconfirmed.caseCache.completion?.reason, 'provider_settlement_unconfirmed');

  const secretFailureStore = new TestCacheStore();
  const secretFailureIdentity = buildProviderCacheIdentity(
    { ...liveRequest('secret-failure'), region: 'secret-failure' },
    policy,
    'primary',
    'v1:sha256:secret-failure',
  );
  const secretFailure = await new ProviderCacheCoordinator(secretFailureStore).execute(
    { ...liveRequest('secret-failure'), region: 'secret-failure' },
    secretFailureIdentity,
    policy,
    async () => {
      throw new Error('Bearer sk_live_forbidden_completion');
    },
  );
  assert.equal(secretFailure.failureReason, 'provider_error');
  assert.equal(secretFailureStore.completion?.reason, 'provider_error');

  const outageStore = new TestCacheStore();
  const outageCoordinator = new ProviderCacheCoordinator(outageStore);
  const outageIdentity = { ...identity, fingerprint: cacheStore.entry!.material.fingerprint };
  outageCoordinator.l1.set(outageIdentity, cacheStore.entry!, policy);
  outageStore.read = async () => {
    throw new Error('redis unavailable');
  };
  let outageOwnerCalls = 0;
  const l1DuringOutage = await outageCoordinator.execute(
    liveRequest('outage-l1'),
    outageIdentity,
    policy,
    async () => {
      outageOwnerCalls += 1;
      throw new Error('must not execute');
    },
  );
  assert.ok(l1DuringOutage.material, 'validated fresh L1 may serve during Redis outage');
  assert.equal(outageOwnerCalls, 0);
  const l1MissDuringOutage = await outageCoordinator.execute(
    { ...liveRequest('outage-miss'), region: 'outage-miss' },
    { ...outageIdentity, hash: `${outageIdentity.hash}-miss`, fingerprint: 'v1:sha256:outage-miss' },
    policy,
    async () => {
      outageOwnerCalls += 1;
      throw new Error('must not execute');
    },
  );
  assert.equal(l1MissDuringOutage.failureReason, 'provider_cache_control_unavailable');
  assert.equal(outageOwnerCalls, 0);

  const staleStore = new TestCacheStore();
  staleStore.entry = { ...cacheStore.entry!, freshUntil: Date.now() - 1, staleUntil: Date.now() + 20 };
  const staleCoordinator = new ProviderCacheCoordinator(staleStore);
  const staleOutcome = await staleCoordinator.execute(liveRequest('stale-boundary'), buildProviderCacheIdentity(liveRequest('stale-boundary'), policy, 'primary', fingerprint), policy, async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
    throw new Error('provider_error');
  });
  assert.equal(staleOutcome.material, undefined, 'stale candidate expiring during refresh must not be served');

  const ownerStaleStore = new TestCacheStore();
  ownerStaleStore.entry = { ...cacheStore.entry!, freshUntil: Date.now() - 1, staleUntil: Date.now() + 5_000 };
  const ownerStaleMemory = new MemoryProviderControlStore();
  const ownerStaleControl: ProviderControlStore = { kind:'redis',isReady:()=>true,admit:(admission)=>ownerStaleMemory.admit(admission),claimExecution:(reservation,token)=>ownerStaleMemory.claimExecution(reservation,token),settle:(reservation,status)=>ownerStaleMemory.settle(reservation,status),close:()=>ownerStaleMemory.close() };
  const ownerStaleResult = await executeProviderApiGateRequest({ ...liveRequest('owner-stale'), region:'owner-stale' }, { ...adapter, fetchManaged:async()=>{throw new Error('secret provider failure');} }, { ...context,cacheCoordinator:new ProviderCacheCoordinator(ownerStaleStore),providerControlStore:ownerStaleControl });
  assert.equal(ownerStaleResult.cacheSnapshot?.freshness,'stale');
  assert.equal(ownerStaleResult.decision.providerCallMode,'live_staging_call');
  assert.equal(ownerStaleResult.decision.reason,'stale_if_error');
  assert.equal(ownerStaleResult.settlementState,'settled_unknown_outcome');
  assert.ok(ownerStaleResult.providerControlSnapshot);
  assert.ok(ownerStaleResult.response,'eligible stale payload is returned without erasing owner evidence');

  const ownershipPolicy = buildTestProviderCachePolicy({ policyVersion: 'ownership-loss', flightLeaseMs: 1_100, followerWaitTimeoutMs: 2_000 });
  const ownershipControlPolicy = buildTestProviderControlPolicy({ policyVersion: 'ownership-loss', concurrency: { maxConcurrent: 2, leaseDurationMs: 1_000, providerTimeoutMs: 500 } });
  const makeOwnershipContext = (store: TestCacheStore, control: ProviderControlStore) => ({ cacheCoordinator: new ProviderCacheCoordinator(store), cachePolicyResolver: { resolve: async () => ownershipPolicy }, providerControlStore: control, policyResolver: { resolve: async () => ownershipControlPolicy }, resilienceStore: new TestRedisResilienceStore(), resiliencePolicyResolver: { resolve: async () => resiliencePolicy }, credentialPoolId: 'primary' });

  const preLossStore = new TestCacheStore();
  preLossStore.renewFlight = async () => false;
  const preLossMemory = new MemoryProviderControlStore();
  const preLossSettlements: string[] = [];
  const delayedControl: ProviderControlStore = {
    kind: 'redis', isReady: () => true,
    admit: async (admission) => { await new Promise((resolve) => setTimeout(resolve, 450)); return preLossMemory.admit(admission); },
    claimExecution: (reservation, token) => preLossMemory.claimExecution(reservation, token),
    settle: async (reservation, status) => { preLossSettlements.push(status); return preLossMemory.settle(reservation, status); },
    close: () => preLossMemory.close(),
  };
  let preLossAdapterCalls = 0;
  const preLossAdapter = { ...adapter, fetchManaged: async (sourceRequest: never) => { preLossAdapterCalls += 1; return fixture.fetch(sourceRequest); } };
  const preLossResult = await executeProviderApiGateRequest({ ...liveRequest('pre-loss'), region: 'pre-loss' }, preLossAdapter, makeOwnershipContext(preLossStore, delayedControl));
  assert.equal(preLossAdapterCalls, 0, 'already-aborted ownership signal must block adapter invocation');
  assert.deepEqual(preLossSettlements, ['RELEASED']);
  assert.equal(preLossResult.decision.reason, 'provider_singleflight_ownership_lost', 'pre-adapter ownership-loss result');
  assert.equal(preLossResult.decision.providerCallMode, 'live_staging_call');
  assert.equal(preLossResult.settlementState, 'settled_released');
  assert.ok(preLossResult.providerControlSnapshot);
  assert.equal(preLossStore.entry, undefined);

  const duringLossStore = new TestCacheStore();
  duringLossStore.renewFlight = async () => false;
  const duringLossMemory = new MemoryProviderControlStore();
  const duringLossSettlements: string[] = [];
  const duringControl: ProviderControlStore = {
    kind: 'redis', isReady: () => true,
    admit: (admission) => duringLossMemory.admit(admission),
    claimExecution: (reservation, token) => duringLossMemory.claimExecution(reservation, token),
    settle: async (reservation, status) => { duringLossSettlements.push(status); return duringLossMemory.settle(reservation, status); },
    close: () => duringLossMemory.close(),
  };
  let duringAdapterCalls = 0;
  let duringAdapterAborted = false;
  const deferredAdapter = { ...adapter, fetchManaged: async (_sourceRequest: never, execution: { signal: AbortSignal }) => {
    duringAdapterCalls += 1;
    return new Promise<never>((_resolve, reject) => execution.signal.addEventListener('abort', () => { duringAdapterAborted = true; reject(execution.signal.reason); }, { once: true }));
  } };
  const duringResult = await executeProviderApiGateRequest({ ...liveRequest('during-loss'), region: 'during-loss' }, deferredAdapter, makeOwnershipContext(duringLossStore, duringControl));
  assert.equal(duringAdapterCalls, 1);
  assert.equal(duringAdapterAborted, true);
  assert.deepEqual(duringLossSettlements, ['COMMIT_REQUIRED_UNKNOWN_OUTCOME']);
  assert.equal(duringResult.decision.reason, 'provider_singleflight_ownership_lost', 'in-adapter ownership-loss result');
  assert.equal(duringResult.decision.providerCallMode, 'live_staging_call');
  assert.equal(duringResult.settlementState, 'settled_unknown_outcome');
  assert.ok(duringResult.providerControlSnapshot);
  assert.equal(duringLossStore.entry, undefined);
  console.log('provider cache unit acceptance passed: gate_requests=1000 adapter_calls=1 admits=1 claims=1');
}
