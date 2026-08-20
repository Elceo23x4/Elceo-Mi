import assert from 'node:assert/strict';
import { TiingoMarketDataAdapter } from '../provider-sources/tiingo/tiingo-adapter.js';
import {
  assertProviderCachePolicyAuthority,
  buildProviderCacheIdentity,
  hashProviderCachePolicy,
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
import { MemoryProviderControlStore, type ProviderControlStore } from '../provider-sources/provider-control/index.js';
import { buildTestProviderControlPolicy } from './provider-control.test.js';

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
  const context = { cacheCoordinator: coordinator, cachePolicyResolver: { resolve: async () => policy }, providerControlStore: controlStore, policyResolver: { resolve: async () => controlPolicy }, credentialPoolId: 'primary' };
  const poisoned = liveRequest('caller-0', { cacheHitPayload: compatibilityResponse('caller-0', 'poison'), stalePayload: compatibilityResponse('caller-0', 'stale-poison'), fallbackMode: 'stale_if_error' });
  const poisonedResult = await executeProviderApiGateRequest(poisoned, adapter, context);
  assert.equal(JSON.stringify(poisonedResult.response?.payload).includes('poison'), false);
  assert.ok(cacheStore.entry, `real provider success must publish cache: ${poisonedResult.decision.reason}/${poisonedResult.settlementState}/attempts=${cacheStore.publishAttempts}/bytes=${cacheStore.publishedBytes}/completion=${cacheStore.completion?.reason}`);
  const cachedResult = await executeProviderApiGateRequest(liveRequest('caller-cache-check'), adapter, context);
  assert.equal(JSON.stringify(cachedResult.response?.payload).includes('poison'), false);
  assert.equal(adapterCalls, 1, 'live compatibility payload must not cause a second adapter call');

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

  const staleStore = new TestCacheStore();
  staleStore.entry = { ...cacheStore.entry!, freshUntil: Date.now() - 1, staleUntil: Date.now() + 20 };
  const staleCoordinator = new ProviderCacheCoordinator(staleStore);
  const staleOutcome = await staleCoordinator.execute(liveRequest('stale-boundary'), buildProviderCacheIdentity(liveRequest('stale-boundary'), policy, 'primary', fingerprint), policy, async () => {
    await new Promise((resolve) => setTimeout(resolve, 40));
    throw new Error('provider_error');
  });
  assert.equal(staleOutcome.material, undefined, 'stale candidate expiring during refresh must not be served');

  const ownershipPolicy = buildTestProviderCachePolicy({ policyVersion: 'ownership-loss', flightLeaseMs: 1_100, followerWaitTimeoutMs: 2_000 });
  const ownershipControlPolicy = buildTestProviderControlPolicy({ policyVersion: 'ownership-loss', concurrency: { maxConcurrent: 2, leaseDurationMs: 1_000, providerTimeoutMs: 500 } });
  const makeOwnershipContext = (store: TestCacheStore, control: ProviderControlStore) => ({ cacheCoordinator: new ProviderCacheCoordinator(store), cachePolicyResolver: { resolve: async () => ownershipPolicy }, providerControlStore: control, policyResolver: { resolve: async () => ownershipControlPolicy }, credentialPoolId: 'primary' });

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
  console.log('provider cache unit acceptance passed: gate_requests=1000 adapter_calls=1 admits=1 claims=1');
}
