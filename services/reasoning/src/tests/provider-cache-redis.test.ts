import assert from 'node:assert/strict';
import { TiingoMarketDataAdapter } from '../provider-sources/tiingo/tiingo-adapter.js';
import {
  buildProviderCacheIdentity,
  createProviderCacheRedisClient,
  hashProviderCachedMaterial,
  ProviderCacheCoordinator,
  RedisProviderCacheStore,
  type ProviderCachedMaterial,
  type ProviderCacheStore,
} from '../provider-sources/provider-cache/index.js';
import { buildProviderRequestFingerprint, createProviderControlRedisClient, providerControlKeys, RedisProviderControlStore, type ProviderControlStore } from '../provider-sources/provider-control/index.js';
import { executeProviderApiGateRequest, type ProviderRuntimeRequest, type ProviderRuntimeResponse } from '../provider-sources/provider-api-gate.js';
import { buildTestProviderCachePolicy } from './provider-cache.test.js';
import { buildTestProviderControlPolicy } from './provider-control.test.js';
import { createProviderResilienceRedisClient, providerResilienceKeys, RedisProviderResilienceStore, type ProviderProbeLease, type ProviderResilienceOutcome } from '../provider-sources/provider-resilience/index.js';
import { buildTestProviderResiliencePolicy } from './provider-resilience.test.js';

function liveRequest(requestId: string, asset = 'eur_usd', carried?: ProviderRuntimeResponse): ProviderRuntimeRequest {
  return {
    requestId,
    sourceId: 'tiingo_market_data',
    capabilityId: 'market_price_history',
    asset,
    activationMode: 'staging_live_allowed',
    provenance: { actor: 'redis-test', purpose: 'pgs2a_integrated_acceptance' },
    policy: {
      explicitStagingLiveAllow: true,
      requestMetadata: { credentialPresent: true },
      ...(carried ? { cacheHitPayload: carried, stalePayload: carried, fallbackMode: 'stale_if_error' as const } : {}),
    },
  };
}

function carriedResponse(requestId: string): ProviderRuntimeResponse {
  return {
    requestId,
    responseId: `poison-${requestId}`,
    sourceId: 'tiingo_market_data',
    capabilityId: 'market_price_history',
    adapterId: 'tiingo_market_data_market_price_history_adapter',
    receivedAt: new Date().toISOString(),
    payload: { poison: 'Bearer sk_live_must_never_persist' },
    payloadSchemaStatus: 'valid',
    payloadSizeBytes: 50,
    recordCount: 1,
    provenance: { requestId, sourceId: 'tiingo_market_data' },
  };
}

export async function runProviderCacheRedisIntegrationTests(): Promise<void> {
  if (process.env.PROVIDER_CACHE_REDIS_INTEGRATION !== '1') return;
  const namespace = `elceo:provider-cache:test:${process.pid}:${Date.now()}`;
  const cacheClients = [createProviderCacheRedisClient(), createProviderCacheRedisClient()];
  const controlClients = [createProviderControlRedisClient(), createProviderControlRedisClient()];
  const resilienceClients = [createProviderResilienceRedisClient(), createProviderResilienceRedisClient()];
  const cacheStores = [new RedisProviderCacheStore(cacheClients[0]!, namespace), new RedisProviderCacheStore(cacheClients[1]!, namespace)];
  const controlStores = [new RedisProviderControlStore(controlClients[0]!, `${namespace}:control`), new RedisProviderControlStore(controlClients[1]!, `${namespace}:control`)];
  const resilienceStores = [new RedisProviderResilienceStore(resilienceClients[0]!, `${namespace}:resilience`), new RedisProviderResilienceStore(resilienceClients[1]!, `${namespace}:resilience`)];
  const cachePolicy = buildTestProviderCachePolicy({ policyVersion: 'redis-integrated', freshTtlMs: 2_000, staleIfErrorTtlMs: 1_000, flightLeaseMs: 700, followerWaitTimeoutMs: 5_000, completionTtlMs: 300, maxEntryBytes: 1_048_576 });
  const controlPolicy = buildTestProviderControlPolicy({ policyVersion: 'redis-integrated', rate: { capacity: 10, refillAmount: 10, refillIntervalMs: 60_000, requestTokens: 1 }, quota: { kind: 'fixed_duration', limit: 10, windowMs: 60_000 }, cost: { kind: 'fixed_duration', budgetUnits: 10, windowMs: 60_000, requestCostUnits: 1 }, concurrency: { maxConcurrent: 10, leaseDurationMs: 700, providerTimeoutMs: 100 } });
  const resiliencePolicy = buildTestProviderResiliencePolicy({ policyVersion: 'redis-integrated' });
  let admits = 0;
  let claims = 0;
  const counted = (store: RedisProviderControlStore): ProviderControlStore => ({
    kind: 'redis',
    isReady: () => store.isReady(),
    admit: async (request) => { admits += 1; return store.admit(request); },
    claimExecution: async (reservation, token) => { claims += 1; return store.claimExecution(reservation, token); },
    settle: (reservation, status) => store.settle(reservation, status),
    close: () => Promise.resolve(),
  });
  const countedControls = controlStores.map(counted);
  const fixture = new TiingoMarketDataAdapter({ mode: 'fixture' });
  let adapterCalls = 0;
  const adapter = {
    descriptor: fixture.descriptor,
    fetch: async () => { throw new Error('unmanaged_fetch_forbidden'); },
    fetchManaged: async (request: never) => { adapterCalls += 1; await new Promise((resolve) => setTimeout(resolve, 50)); return fixture.fetch(request); },
    normalize: async () => [],
  };
  const context = (coordinator: ProviderCacheCoordinator, control: ProviderControlStore, index = 0) => ({ cacheCoordinator: coordinator, cachePolicyResolver: { resolve: async () => cachePolicy }, providerControlStore: control, policyResolver: { resolve: async () => controlPolicy }, resilienceStore: resilienceStores[index]!, resiliencePolicyResolver: { resolve: async () => resiliencePolicy }, credentialPoolId: 'primary' });
  try {
    const localCoordinator = new ProviderCacheCoordinator(cacheStores[0]!);
    const poison = carriedResponse('leader');
    const localWave = await Promise.all(Array.from({ length: 1_000 }, (_, index) => executeProviderApiGateRequest(liveRequest(`local-${index}`, 'eur_usd', poison), adapter, context(localCoordinator, countedControls[0]!))));
    assert.equal(adapterCalls, 1, '1,000 same-process gate requests must execute one adapter');
    assert.equal(admits, 1, '1,000 same-process gate requests must admit PGS-1 once');
    assert.equal(claims, 1, '1,000 same-process gate requests must claim PGS-1 once');
    assert.equal(localCoordinator.localInflightSize, 0);
    const owners = localWave.filter((result) => result.cacheSnapshot?.singleFlightRole === 'owner');
    assert.equal(owners.length, 1, 'exactly one caller must report distributed ownership');
    assert.equal(owners[0]!.decision.providerCallMode, 'live_staging_call');
    assert.equal(owners[0]!.settlementState, 'settled_committed');
    assert.ok(owners[0]!.providerControlSnapshot);
    const followers = localWave.filter((result) => result.cacheSnapshot?.singleFlightRole !== 'owner');
    assert.equal(followers.length, 999);
    assert.ok(followers.every((result) => result.decision.providerCallMode === 'cache_response'));
    assert.ok(followers.every((result) => result.settlementState === 'not_required'));
    assert.ok(followers.every((result) => result.providerControlSnapshot === undefined));
    for (let index = 0; index < localWave.length; index += 1) {
      assert.equal(localWave[index]!.response?.requestId, `local-${index}`);
      assert.equal(localWave[index]!.response?.provenance.requestId, `local-${index}`);
      assert.equal(JSON.stringify(localWave[index]!.response?.payload).includes('sk_live'), false);
    }
    const fingerprint = buildProviderRequestFingerprint(liveRequest('inspect'));
    const identity = buildProviderCacheIdentity(liveRequest('inspect'), cachePolicy, 'primary', fingerprint);
    const persisted = await cacheStores[1]!.read(identity, cachePolicy);
    const persistedRaw = await cacheClients[0]!.get(`${namespace}:{${identity.hash}}:cache`);
    const parsedMaterial = JSON.parse(persistedRaw!).material as ProviderCachedMaterial;
    const { materialIntegrityHash, ...parsedUnsigned } = parsedMaterial;
    assert.equal(persisted.state, 'FRESH', `cross-instance L2 provider material must validate: fingerprint=${parsedMaterial.fingerprint === identity.fingerprint} policy=${parsedMaterial.cachePolicyHash === cachePolicy.canonicalPolicyHash} integrity=${materialIntegrityHash === hashProviderCachedMaterial(parsedUnsigned)}`);
    assert.equal(JSON.stringify(persisted.entry).includes('sk_live'), false);

    const crossCoordinators = [new ProviderCacheCoordinator(cacheStores[0]!), new ProviderCacheCoordinator(cacheStores[1]!), new ProviderCacheCoordinator(cacheStores[0]!), new ProviderCacheCoordinator(cacheStores[1]!)];
    for (let iteration = 0; iteration < 3; iteration += 1) {
      const before: { adapterCalls: number; admits: number; claims: number } = { adapterCalls, admits, claims };
      const crossWave = await Promise.all(Array.from({ length: 200 }, (_, index) => executeProviderApiGateRequest({ ...liveRequest(`cross-${iteration}-${index}`), region: `cross-instance-${iteration}` }, adapter, context(crossCoordinators[index % crossCoordinators.length]!, countedControls[index % countedControls.length]!))));
      assert.equal(adapterCalls - before.adapterCalls, 1);
      assert.equal(admits - before.admits, 1);
      assert.equal(claims - before.claims, 1);
      const badCrossIndex = crossWave.findIndex((result, index) => result.response?.requestId !== `cross-${iteration}-${index}` || result.response.provenance.requestId !== `cross-${iteration}-${index}`);
      assert.equal(badCrossIndex, -1, `cross caller identity: iteration=${iteration} index=${badCrossIndex} result=${badCrossIndex >= 0 ? JSON.stringify(crossWave[badCrossIndex]) : 'none'}`);
    }

    // Deterministically force the post-publication reacquisition race: B has
    // observed MISS and lost acquisition to A; after A publishes, B's queued
    // follower read represents its earlier MISS, then B acquires the free
    // flight. The mandatory post-acquisition validated L2 read must suppress a
    // second PGS-1/provider execution.
    const raceCachePolicy = buildTestProviderCachePolicy({ policyVersion: 'post-publication-race', freshTtlMs: 2_000, staleIfErrorTtlMs: 1_000, flightLeaseMs: 700, followerWaitTimeoutMs: 3_000 });
    const raceControlPolicy = buildTestProviderControlPolicy({ policyVersion: 'post-publication-race', rate: { capacity: 3, refillAmount: 3, refillIntervalMs: 60_000, requestTokens: 1 }, quota: { kind: 'fixed_duration', limit: 3, windowMs: 60_000 }, cost: { kind: 'fixed_duration', budgetUnits: 3, windowMs: 60_000, requestCostUnits: 1 }, concurrency: { maxConcurrent: 2, leaseDurationMs: 700, providerTimeoutMs: 100 } });
    const raceResiliencePolicy = buildTestProviderResiliencePolicy({ policyVersion: 'post-publication-race' });
    let raceAdmits = 0, raceClaims = 0, raceAdapterCalls = 0;
    const raceControl = (store: RedisProviderControlStore): ProviderControlStore => ({ kind: 'redis', isReady: () => store.isReady(), admit: async value => { raceAdmits += 1; return store.admit(value); }, claimExecution: async (reservation, token) => { raceClaims += 1; return store.claimExecution(reservation, token); }, settle: (reservation, status) => store.settle(reservation, status), close: () => Promise.resolve() });
    let ownerStartedResolve!: () => void, allowOwnerResolve!: () => void, followerMissResolve!: () => void;
    const ownerStarted = new Promise<void>(resolve => { ownerStartedResolve = resolve; }), allowOwner = new Promise<void>(resolve => { allowOwnerResolve = resolve; }), followerMiss = new Promise<void>(resolve => { followerMissResolve = resolve; });
    const raceAdapter = { ...adapter, fetchManaged: async (value: never) => { raceAdapterCalls += 1; ownerStartedResolve(); await allowOwner; return fixture.fetch(value); } };
    let followerReads = 0;
    const followerStore: ProviderCacheStore = { kind: 'redis', read: async (cacheIdentity, resolvedPolicy) => { followerReads += 1; if (followerReads === 2) return { state: 'MISS' }; return cacheStores[1]!.read(cacheIdentity, resolvedPolicy); }, tryAcquireFlight: async (cacheIdentity, token, leaseMs) => { const acquired = await cacheStores[1]!.tryAcquireFlight(cacheIdentity, token, leaseMs); if (!acquired) followerMissResolve(); return acquired; }, renewFlight: (cacheIdentity, token, leaseMs) => cacheStores[1]!.renewFlight(cacheIdentity, token, leaseMs), readFlightState: cacheIdentity => cacheStores[1]!.readFlightState(cacheIdentity), publishSuccessAndComplete: (cacheIdentity, token, material, resolvedPolicy) => cacheStores[1]!.publishSuccessAndComplete(cacheIdentity, token, material, resolvedPolicy), publishFailureAndComplete: (cacheIdentity, token, reason, ttlMs) => cacheStores[1]!.publishFailureAndComplete(cacheIdentity, token, reason, ttlMs), releaseOwnerSafely: (cacheIdentity, token) => cacheStores[1]!.releaseOwnerSafely(cacheIdentity, token) };
    const raceContext = (coordinator: ProviderCacheCoordinator, control: ProviderControlStore, index: number) => ({ cacheCoordinator: coordinator, cachePolicyResolver: { resolve: async () => raceCachePolicy }, providerControlStore: control, policyResolver: { resolve: async () => raceControlPolicy }, resilienceStore: resilienceStores[index]!, resiliencePolicyResolver: { resolve: async () => raceResiliencePolicy }, credentialPoolId: 'primary' });
    const ownerRace = executeProviderApiGateRequest({ ...liveRequest('post-publish-owner'), region: 'post-publication-race' }, raceAdapter, raceContext(new ProviderCacheCoordinator(cacheStores[0]!), raceControl(controlStores[0]!), 0));
    const ownerEnteredProvider = await Promise.race([ownerStarted.then(() => true), ownerRace.then(() => false)]);
    assert.equal(ownerEnteredProvider, true, 'the first coordinator must reach managed provider execution');
    const followerRace = executeProviderApiGateRequest({ ...liveRequest('post-publish-follower'), region: 'post-publication-race' }, raceAdapter, raceContext(new ProviderCacheCoordinator(followerStore), raceControl(controlStores[1]!), 1));
    await followerMiss;
    allowOwnerResolve();
    const [ownerRaceResult, followerRaceResult] = await Promise.all([ownerRace, followerRace]);
    assert.deepEqual({ raceAdapterCalls, raceAdmits, raceClaims }, { raceAdapterCalls: 1, raceAdmits: 1, raceClaims: 1 });
    assert.equal(ownerRaceResult.cacheSnapshot?.singleFlightRole, 'owner');
    assert.equal(followerReads, 3, 'follower must validate L2 again after acquiring the released flight');
    assert.equal(followerRaceResult.cacheSnapshot?.singleFlightRole, 'follower');
    assert.equal(followerRaceResult.decision.providerCallMode, 'cache_response');
    assert.equal(followerRaceResult.settlementState, 'not_required');
    assert.equal(followerRaceResult.providerControlSnapshot, undefined);

    // Hold A's mandatory post-acquisition validation beyond the authoritative
    // Redis lease, let B become the valid owner, then prove A's pre-execution
    // renewal fence prevents every upstream boundary and preserves B's token.
    const expiryCachePolicy = buildTestProviderCachePolicy({ policyVersion: 'pre-execution-expiry', freshTtlMs: 2_000, staleIfErrorTtlMs: 1_000, flightLeaseMs: 700, followerWaitTimeoutMs: 3_000 });
    const expiryControlPolicy = buildTestProviderControlPolicy({ policyVersion: 'pre-execution-expiry', rate: { capacity: 3, refillAmount: 3, refillIntervalMs: 60_000, requestTokens: 1 }, quota: { kind: 'fixed_duration', limit: 3, windowMs: 60_000 }, cost: { kind: 'fixed_duration', budgetUnits: 3, windowMs: 60_000, requestCostUnits: 1 }, concurrency: { maxConcurrent: 2, leaseDurationMs: 700, providerTimeoutMs: 100 } });
    const expiryResiliencePolicy = buildTestProviderResiliencePolicy({ policyVersion: 'pre-execution-expiry' });
    let staleAdmits = 0, staleClaims = 0, staleAdapterCalls = 0, validAdmits = 0, validClaims = 0, validAdapterCalls = 0;
    const expiryControl = (store: RedisProviderControlStore, stale: boolean): ProviderControlStore => ({ kind: 'redis', isReady: () => store.isReady(), admit: async value => { if (stale) staleAdmits += 1; else validAdmits += 1; return store.admit(value); }, claimExecution: async (reservation, token) => { if (stale) staleClaims += 1; else validClaims += 1; return store.claimExecution(reservation, token); }, settle: (reservation, status) => store.settle(reservation, status), close: () => Promise.resolve() });
    let staleAcquiredResolve!: () => void, releaseValidationResolve!: () => void, validProviderResolve!: () => void, releaseValidProviderResolve!: () => void;
    const staleAcquired = new Promise<void>(resolve => { staleAcquiredResolve = resolve; }), releaseValidation = new Promise<void>(resolve => { releaseValidationResolve = resolve; }), validProvider = new Promise<void>(resolve => { validProviderResolve = resolve; }), releaseValidProvider = new Promise<void>(resolve => { releaseValidProviderResolve = resolve; });
    let staleReads = 0;
    const staleOwnerStore: ProviderCacheStore = { kind: 'redis', read: async (cacheIdentity, resolvedPolicy) => { staleReads += 1; if (staleReads === 2) { await releaseValidation; return { state: 'MISS' }; } return cacheStores[0]!.read(cacheIdentity, resolvedPolicy); }, tryAcquireFlight: async (cacheIdentity, token, leaseMs) => { const acquired = await cacheStores[0]!.tryAcquireFlight(cacheIdentity, token, leaseMs); if (acquired) staleAcquiredResolve(); return acquired; }, renewFlight: (cacheIdentity, token, leaseMs) => cacheStores[0]!.renewFlight(cacheIdentity, token, leaseMs), readFlightState: cacheIdentity => cacheStores[0]!.readFlightState(cacheIdentity), publishSuccessAndComplete: (cacheIdentity, token, material, resolvedPolicy) => cacheStores[0]!.publishSuccessAndComplete(cacheIdentity, token, material, resolvedPolicy), publishFailureAndComplete: (cacheIdentity, token, reason, ttlMs) => cacheStores[0]!.publishFailureAndComplete(cacheIdentity, token, reason, ttlMs), releaseOwnerSafely: (cacheIdentity, token) => cacheStores[0]!.releaseOwnerSafely(cacheIdentity, token) };
    const expiryContext = (coordinator: ProviderCacheCoordinator, control: ProviderControlStore, index: number) => ({ cacheCoordinator: coordinator, cachePolicyResolver: { resolve: async () => expiryCachePolicy }, providerControlStore: control, policyResolver: { resolve: async () => expiryControlPolicy }, resilienceStore: resilienceStores[index]!, resiliencePolicyResolver: { resolve: async () => expiryResiliencePolicy }, credentialPoolId: 'primary' });
    const staleRequest = { ...liveRequest('expired-pre-execution-owner'), region: 'pre-execution-expiry' }, validRequest = { ...liveRequest('valid-successor-owner'), region: 'pre-execution-expiry' };
    const staleExecution = executeProviderApiGateRequest(staleRequest, { ...adapter, fetchManaged: async (value: never) => { staleAdapterCalls += 1; return fixture.fetch(value); } }, expiryContext(new ProviderCacheCoordinator(staleOwnerStore), expiryControl(controlStores[0]!, true), 0));
    await staleAcquired;
    const expiryIdentity = buildProviderCacheIdentity(staleRequest, expiryCachePolicy, 'primary', buildProviderRequestFingerprint(staleRequest));
    const authoritativeRemaining = await cacheClients[0]!.pTTL(`${namespace}:{${expiryIdentity.hash}}:flight`);
    assert.ok(authoritativeRemaining > 0);
    await new Promise(resolve => setTimeout(resolve, authoritativeRemaining + 1));
    const validExecution = executeProviderApiGateRequest(validRequest, { ...adapter, fetchManaged: async (value: never) => { validAdapterCalls += 1; validProviderResolve(); await releaseValidProvider; return fixture.fetch(value); } }, expiryContext(new ProviderCacheCoordinator(cacheStores[1]!), expiryControl(controlStores[1]!, false), 1));
    await validProvider;
    releaseValidationResolve();
    const staleResult = await staleExecution;
    assert.deepEqual({ staleAdapterCalls, staleAdmits, staleClaims }, { staleAdapterCalls: 0, staleAdmits: 0, staleClaims: 0 });
    assert.equal(staleResult.decision.reason, 'provider_singleflight_ownership_lost');
    assert.equal((await cacheStores[0]!.readFlightState(expiryIdentity)).active, true, 'stale A must preserve successor B token');
    releaseValidProviderResolve();
    const validResult = await validExecution;
    assert.deepEqual({ validAdapterCalls, validAdmits, validClaims }, { validAdapterCalls: 1, validAdmits: 1, validClaims: 1 });
    assert.equal(validResult.settlementState, 'settled_committed');
    assert.equal((await cacheStores[0]!.read(expiryIdentity, expiryCachePolicy)).state, 'FRESH');

    // Preserve PGS-1's ambiguous/lost CLAIM acceptance proofs through the
    // mandatory PGS-2 owner boundary.
    const recoveryCachePolicy = buildTestProviderCachePolicy({ policyVersion: 'claim-recovery-cache', flightLeaseMs: 2_000, followerWaitTimeoutMs: 4_000 });
    const recoveryControlPolicy = buildTestProviderControlPolicy({ policyVersion: 'claim-recovery-control', rate: { capacity: 2, refillAmount: 2, refillIntervalMs: 60_000, requestTokens: 1 }, quota: { kind: 'fixed_duration', limit: 2, windowMs: 60_000 }, cost: { kind: 'fixed_duration', budgetUnits: 2, windowMs: 60_000, requestCostUnits: 1 }, concurrency: { maxConcurrent: 1, leaseDurationMs: 700, providerTimeoutMs: 100 } });
    let lostClaim = true;
    const ambiguousControl = new RedisProviderControlStore(controlClients[0]!, `${namespace}:ambiguous`, 3_000, 60_000, async (_attempt, command) => {
      const result = await command;
      if (lostClaim) { lostClaim = false; throw new Error('simulated_lost_claim_response'); }
      return result;
    });
    const ambiguousKeys = providerControlKeys(recoveryControlPolicy, `${namespace}:ambiguous`);
    let recoveryAdapterCalls = 0;
    let ambiguousMaximumConcurrency = 0;
    const recoveryAdapter = { ...adapter, fetchManaged: async (request: never) => { recoveryAdapterCalls += 1; ambiguousMaximumConcurrency=Math.max(ambiguousMaximumConcurrency,await controlClients[0]!.zCard(ambiguousKeys.leases));return fixture.fetch(request); } };
    const recoveryResult = await executeProviderApiGateRequest({ ...liveRequest('ambiguous-claim'), region: 'ambiguous-claim' }, recoveryAdapter, { cacheCoordinator: new ProviderCacheCoordinator(cacheStores[0]!), cachePolicyResolver: { resolve: async () => recoveryCachePolicy }, providerControlStore: ambiguousControl, policyResolver: { resolve: async () => recoveryControlPolicy }, resilienceStore: resilienceStores[0]!, resiliencePolicyResolver: { resolve: async () => resiliencePolicy }, credentialPoolId: 'primary' });
    assert.equal(recoveryResult.settlementState, 'settled_committed');
    assert.equal(recoveryAdapterCalls, 1, 'ambiguous CLAIM reconciliation invokes provider once');
    assert.equal(ambiguousMaximumConcurrency, 1);
    assert.equal(await controlClients[0]!.hGet(ambiguousKeys.rate, 'tokens'), '1');
    assert.equal(await controlClients[0]!.hGet(ambiguousKeys.quota, 'used'), '1');
    assert.equal(await controlClients[0]!.hGet(ambiguousKeys.cost, 'reserved'), '0');
    assert.equal(await controlClients[0]!.hGet(ambiguousKeys.cost, 'committed'), '1');
    const ambiguousRequest = { ...liveRequest('ambiguous-claim'), region: 'ambiguous-claim' };
    const ambiguousIdentity = buildProviderCacheIdentity(ambiguousRequest, recoveryCachePolicy, 'primary', buildProviderRequestFingerprint(ambiguousRequest));
    assert.equal((await cacheStores[0]!.read(ambiguousIdentity, recoveryCachePolicy)).state, 'FRESH');

    let lateClaim = true;
    const lateControl = new RedisProviderControlStore(controlClients[1]!, `${namespace}:late`, 3_000, 60_000, async (_attempt, command) => {
      const result = await command;
      if (lateClaim) { lateClaim = false; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 720); throw new Error('late_lost_claim_response'); }
      return result;
    });
    const lateKeys = providerControlKeys(recoveryControlPolicy, `${namespace}:late`);
    let lateAdapterCalls = 0;
    let lateMaximumConcurrency = 0;
    const lateResult = await executeProviderApiGateRequest({ ...liveRequest('late-claim'), region: 'late-claim' }, { ...adapter, fetchManaged: async (request: never) => { lateAdapterCalls += 1; lateMaximumConcurrency=Math.max(lateMaximumConcurrency,await controlClients[1]!.zCard(lateKeys.leases));return fixture.fetch(request); } }, { cacheCoordinator: new ProviderCacheCoordinator(cacheStores[1]!), cachePolicyResolver: { resolve: async () => recoveryCachePolicy }, providerControlStore: lateControl, policyResolver: { resolve: async () => recoveryControlPolicy }, resilienceStore: resilienceStores[0]!, resiliencePolicyResolver: { resolve: async () => resiliencePolicy }, credentialPoolId: 'primary' });
    assert.equal(lateResult.settlementState, 'settled_committed');
    assert.equal(lateAdapterCalls, 1, 'late same-token reacquisition invokes provider once');
    assert.equal(lateMaximumConcurrency, 1);
    assert.equal(await controlClients[1]!.hGet(lateKeys.rate, 'tokens'), '1');
    assert.equal(await controlClients[1]!.hGet(lateKeys.quota, 'used'), '1');
    assert.equal(await controlClients[1]!.hGet(lateKeys.cost, 'reserved'), '0');
    assert.equal(await controlClients[1]!.hGet(lateKeys.cost, 'committed'), '1');

    let timeoutAborted = false;
    let timeoutAdapterCalls = 0;
    const timeoutRequest = { ...liveRequest('managed-timeout'), region: 'managed-timeout' };
    const timeoutResult = await executeProviderApiGateRequest(timeoutRequest, { ...adapter, fetchManaged: async (_request: never, execution: { signal: AbortSignal }) => {timeoutAdapterCalls+=1;return new Promise<never>((_resolve, reject) => execution.signal.addEventListener('abort', () => { timeoutAborted = true; reject(execution.signal.reason); }, { once: true }));} }, { cacheCoordinator: new ProviderCacheCoordinator(cacheStores[0]!), cachePolicyResolver: { resolve: async () => recoveryCachePolicy }, providerControlStore: controlStores[0]!, policyResolver: { resolve: async () => recoveryControlPolicy }, resilienceStore: resilienceStores[0]!, resiliencePolicyResolver: { resolve: async () => resiliencePolicy }, credentialPoolId: 'primary' });
    assert.equal(timeoutAdapterCalls, 1);
    assert.equal(timeoutAborted, true, 'managed timeout terminates adapter');
    assert.equal(timeoutResult.response, null);
    assert.equal(timeoutResult.decision.providerCallMode,'live_staging_call');
    assert.equal(timeoutResult.settlementState, 'settled_unknown_outcome');
    assert.ok(timeoutResult.providerControlSnapshot);
    const timeoutKeys=providerControlKeys(recoveryControlPolicy,`${namespace}:control`);
    assert.equal(await controlClients[0]!.hGet(timeoutKeys.rate,'tokens'),'1');
    assert.equal(await controlClients[0]!.hGet(timeoutKeys.quota,'used'),'1');
    assert.equal(await controlClients[0]!.hGet(timeoutKeys.cost,'reserved'),'0');
    assert.equal(await controlClients[0]!.hGet(timeoutKeys.cost,'committed'),'1');
    assert.equal(await controlClients[0]!.zCard(timeoutKeys.leases),0);
    const timeoutIdentity=buildProviderCacheIdentity(timeoutRequest,recoveryCachePolicy,'primary',buildProviderRequestFingerprint(timeoutRequest));
    assert.equal((await cacheStores[0]!.read(timeoutIdentity,recoveryCachePolicy)).state,'MISS');

    let unmanagedCalls = 0;
    const unmanagedResult = await executeProviderApiGateRequest({ ...liveRequest('unmanaged'), region: 'unmanaged' }, { descriptor: fixture.descriptor, fetch: async (request: never) => { unmanagedCalls += 1; return fixture.fetch(request); }, normalize: async () => [] }, { cacheCoordinator: new ProviderCacheCoordinator(cacheStores[0]!), cachePolicyResolver: { resolve: async () => recoveryCachePolicy }, providerControlStore: controlStores[0]!, policyResolver: { resolve: async () => recoveryControlPolicy }, resilienceStore: resilienceStores[0]!, resiliencePolicyResolver: { resolve: async () => resiliencePolicy }, credentialPoolId: 'primary' });
    assert.equal(unmanagedCalls, 0);
    assert.equal(unmanagedResult.decision.reason, 'provider_control_managed_adapter_required');
    assert.equal(unmanagedResult.settlementState, 'settled_released');
    assert.ok(unmanagedResult.providerControlSnapshot);
    const unmanagedRequest={...liveRequest('unmanaged'),region:'unmanaged'};
    const unmanagedIdentity=buildProviderCacheIdentity(unmanagedRequest,recoveryCachePolicy,'primary',buildProviderRequestFingerprint(unmanagedRequest));
    assert.equal((await cacheStores[0]!.read(unmanagedIdentity,recoveryCachePolicy)).state,'MISS');

    const outageClient = createProviderControlRedisClient({ url: 'redis://127.0.0.1:1', connectTimeoutMs: 30 });
    const outageControl = new RedisProviderControlStore(outageClient, `${namespace}:control-outage`, 50);
    const callsBeforeOutage = adapterCalls;
    const outageResult = await executeProviderApiGateRequest({ ...liveRequest('control-outage'), region: 'control-outage' }, adapter, { cacheCoordinator: new ProviderCacheCoordinator(cacheStores[0]!), cachePolicyResolver: { resolve: async () => recoveryCachePolicy }, providerControlStore: outageControl, policyResolver: { resolve: async () => recoveryControlPolicy }, resilienceStore: resilienceStores[0]!, resiliencePolicyResolver: { resolve: async () => resiliencePolicy }, credentialPoolId: 'primary' });
    assert.equal(outageResult.decision.reason, 'provider_control_unavailable');
    assert.equal(adapterCalls, callsBeforeOutage, 'PGS-1 Redis outage is before adapter');
    await outageControl.close();

    const boundaryPolicy = buildTestProviderCachePolicy({ policyVersion: 'freshness-boundary', freshTtlMs: 80, staleIfErrorTtlMs: 80, flightLeaseMs: 700, followerWaitTimeoutMs: 1_000, completionTtlMs: 100, maxEntryBytes: 1_048_576 });
    const boundaryRequest = liveRequest('boundary', 'aud_usd');
    const boundaryIdentity = buildProviderCacheIdentity(boundaryRequest, boundaryPolicy, 'primary', buildProviderRequestFingerprint(boundaryRequest));
    const token = 'boundary-owner';
    assert.equal(await cacheStores[0]!.tryAcquireFlight(boundaryIdentity, token, boundaryPolicy.flightLeaseMs), true, 'boundary owner acquisition');
    const unsigned = { cacheSchemaVersion: 'provider_cached_material_v1' as const, sourceId: boundaryRequest.sourceId, capabilityId: boundaryRequest.capabilityId, adapterId: 'tiingo_market_data_market_price_history_adapter' as const, fingerprint: boundaryIdentity.fingerprint, receivedAt: new Date().toISOString(), payload: { bars: [1] }, payloadSizeBytes: 12, recordCount: 1, cachePolicyVersion: boundaryPolicy.policyVersion, cachePolicyHash: boundaryPolicy.canonicalPolicyHash };
    const material: ProviderCachedMaterial = { ...unsigned, materialIntegrityHash: hashProviderCachedMaterial(unsigned) };
    assert.equal((await cacheStores[0]!.publishSuccessAndComplete(boundaryIdentity, token, material, boundaryPolicy)).published, true, 'boundary publication');
    assert.equal((await cacheStores[0]!.read(boundaryIdentity, boundaryPolicy)).state, 'FRESH', 'freshness boundary initial read');
    await new Promise((resolve) => setTimeout(resolve, 90));
    assert.equal((await cacheStores[0]!.read(boundaryIdentity, boundaryPolicy)).state, 'STALE_BUT_ELIGIBLE');
    await new Promise((resolve) => setTimeout(resolve, 90));
    assert.equal((await cacheStores[0]!.read(boundaryIdentity, boundaryPolicy)).state, 'MISS');

    const smallPolicy = buildTestProviderCachePolicy({ policyVersion: 'byte-boundary', maxEntryBytes: 500, flightLeaseMs: 700 });
    const smallIdentity = buildProviderCacheIdentity(liveRequest('large', 'nzd_usd'), smallPolicy, 'primary', 'v1:sha256:large');
    assert.equal(await cacheStores[0]!.tryAcquireFlight(smallIdentity, 'large-owner', 700), true, 'large owner acquisition');
    const largeUnsigned = { ...unsigned, fingerprint: smallIdentity.fingerprint, cachePolicyVersion: smallPolicy.policyVersion, cachePolicyHash: smallPolicy.canonicalPolicyHash, payload: { value: 'x'.repeat(1_000) }, payloadSizeBytes: 1_000 };
    const oversized = await cacheStores[0]!.publishSuccessAndComplete(smallIdentity, 'large-owner', { ...largeUnsigned, materialIntegrityHash: hashProviderCachedMaterial(largeUnsigned) }, smallPolicy);
    assert.deepEqual(oversized, { published: false, reason: 'provider_cache_entry_too_large' });
    assert.equal((await cacheStores[0]!.read(smallIdentity, smallPolicy)).state, 'MISS');
    assert.equal((await cacheStores[0]!.readFlightState(smallIdentity)).completion?.reason, 'provider_cache_entry_too_large');

    const generationIdentity = { ...smallIdentity, hash: `${smallIdentity.hash}generation` };
    assert.equal(await cacheStores[0]!.tryAcquireFlight(generationIdentity, 'old-owner', 700), true, 'old generation acquisition');
    assert.equal(await cacheStores[0]!.publishFailureAndComplete(generationIdentity, 'old-owner', 'provider_error', 500), true, 'old generation failure completion');
    assert.equal((await cacheStores[0]!.readFlightState(generationIdentity)).completion?.reason, 'provider_error');
    assert.equal(await cacheStores[1]!.tryAcquireFlight(generationIdentity, 'new-owner', 700), true, 'new generation acquisition');
    const generation = await cacheStores[0]!.readFlightState(generationIdentity);
    assert.equal(generation.active, true, 'new generation active');
    assert.equal(generation.completion, undefined);
    assert.equal(await cacheStores[0]!.releaseOwnerSafely(generationIdentity, 'old-owner'), false);
    assert.equal((await cacheStores[0]!.readFlightState(generationIdentity)).active, true, 'late release preserves successor');

    const probeReleasePolicy = buildTestProviderResiliencePolicy({ policyVersion: 'gate-release', failureThreshold: 1, minimumObservations: 1, openDurationMs: 30, halfOpenMaxConcurrent: 1, probeLeaseMs: 500 });
    await resilienceStores[0]!.observe(probeReleasePolicy, { classification: 'provider_5xx' });
    await new Promise((resolve) => setTimeout(resolve, 35));
    let releaseAdmits = 0;
    let releaseClaims = 0;
    let releaseObservations = 0;
    let releaseAdapterCalls = 0;
    const countedResilience = {
      kind: 'redis' as const,
      isReady: () => resilienceStores[0]!.isReady(),
      acquire: (resolvedPolicy: typeof probeReleasePolicy, token: string) => resilienceStores[0]!.acquire(resolvedPolicy, token),
      observe: (resolvedPolicy: typeof probeReleasePolicy, outcome: ProviderResilienceOutcome, probe?: ProviderProbeLease) => { releaseObservations += 1; return resilienceStores[0]!.observe(resolvedPolicy, outcome, probe); },
      releaseProbe: (resolvedPolicy: typeof probeReleasePolicy, probe: ProviderProbeLease) => resilienceStores[0]!.releaseProbe(resolvedPolicy, probe),
      close: () => Promise.resolve(),
    };
    const deniedControl: ProviderControlStore = {
      kind: 'redis', isReady: () => true,
      admit: async () => { releaseAdmits += 1; return { allowed: false, reason: 'provider_rate_exhausted', retryAfterMs: 1 }; },
      claimExecution: async () => { releaseClaims += 1; return { claimed: false, reason: 'provider_control_admission_in_progress' }; },
      settle: async () => false,
      close: () => Promise.resolve(),
    };
    const releaseCachePolicy = buildTestProviderCachePolicy({ policyVersion: 'gate-release', flightLeaseMs: 700 });
    const releaseResult = await executeProviderApiGateRequest({ ...liveRequest('probe-release'), region: 'probe-release' }, { ...adapter, fetchManaged: async (request: never) => { releaseAdapterCalls += 1; return fixture.fetch(request); } }, { cacheCoordinator: new ProviderCacheCoordinator(cacheStores[0]!), cachePolicyResolver: { resolve: async () => releaseCachePolicy }, providerControlStore: deniedControl, policyResolver: { resolve: async () => recoveryControlPolicy }, resilienceStore: countedResilience, resiliencePolicyResolver: { resolve: async () => probeReleasePolicy }, credentialPoolId: 'primary' });
    assert.equal(releaseResult.decision.reason, 'provider_rate_exhausted');
    assert.equal(releaseResult.decision.providerCallMode, 'blocked_live');
    assert.equal(releaseResult.settlementState, 'not_required');
    assert.equal(releaseAdmits, 1);
    assert.equal(releaseClaims, 0);
    assert.equal(releaseAdapterCalls, 0);
    assert.equal(releaseObservations, 0);
    assert.equal((await resilienceStores[1]!.acquire(probeReleasePolicy, 'immediate-after-gate-denial')).allowed, true, 'pre-provider denial must immediately release the sole probe');

    const openPolicy = buildTestProviderResiliencePolicy({ policyVersion: 'gate-open', failureThreshold: 1, minimumObservations: 1, openDurationMs: 5_000 });
    const openCachePolicy = buildTestProviderCachePolicy({ policyVersion: 'gate-open', flightLeaseMs: 700 });
    const openControlPolicy = buildTestProviderControlPolicy({ policyVersion: 'gate-open', rate: { capacity: 5, refillAmount: 5, refillIntervalMs: 60_000, requestTokens: 1 }, quota: { kind: 'fixed_duration', limit: 5, windowMs: 60_000 }, cost: { kind: 'fixed_duration', budgetUnits: 5, windowMs: 60_000, requestCostUnits: 1 }, concurrency: { maxConcurrent: 2, leaseDurationMs: 700, providerTimeoutMs: 100 } });
    await resilienceStores[0]!.observe(openPolicy, { classification: 'provider_5xx' });
    let openAdmits = 0;
    let openClaims = 0;
    let openAdapterCalls = 0;
    const openControl: ProviderControlStore = { kind: 'redis', isReady: () => true, admit: async (request) => { openAdmits += 1; return controlStores[0]!.admit(request); }, claimExecution: async (reservation, token) => { openClaims += 1; return controlStores[0]!.claimExecution(reservation, token); }, settle: (reservation, status) => controlStores[0]!.settle(reservation, status), close: () => Promise.resolve() };
    const openResult = await executeProviderApiGateRequest({ ...liveRequest('resilience-open'), region: 'resilience-open' }, { ...adapter, fetchManaged: async (request: never) => { openAdapterCalls += 1; return fixture.fetch(request); } }, { cacheCoordinator: new ProviderCacheCoordinator(cacheStores[0]!), cachePolicyResolver: { resolve: async () => openCachePolicy }, providerControlStore: openControl, policyResolver: { resolve: async () => openControlPolicy }, resilienceStore: resilienceStores[0]!, resiliencePolicyResolver: { resolve: async () => openPolicy }, credentialPoolId: 'primary' });
    assert.equal(openResult.decision.reason, 'provider_resilience_open');
    assert.equal(openResult.decision.providerCallMode, 'blocked_live');
    assert.equal(openResult.settlementState, 'not_required');
    assert.deepEqual({ openAdapterCalls, openAdmits, openClaims }, { openAdapterCalls: 0, openAdmits: 0, openClaims: 0 });
    const openControlKeys = providerControlKeys(openControlPolicy, `${namespace}:control`);
    assert.deepEqual(await Promise.all([controlClients[0]!.exists(openControlKeys.rate), controlClients[0]!.exists(openControlKeys.quota), controlClients[0]!.exists(openControlKeys.cost), controlClients[0]!.zCard(openControlKeys.leases)]), [0, 0, 0, 0]);

    const resilienceOutageClient = createProviderResilienceRedisClient({ url: 'redis://127.0.0.1:1', connectTimeoutMs: 30 });
    const resilienceOutageStore = new RedisProviderResilienceStore(resilienceOutageClient, `${namespace}:resilience-outage`, 50);
    const outageResiliencePolicy = buildTestProviderResiliencePolicy({ policyVersion: 'resilience-outage' });
    const outageCachePolicy = buildTestProviderCachePolicy({ policyVersion: 'resilience-outage', flightLeaseMs: 700 });
    let resilienceOutageAdmits = 0;
    let resilienceOutageClaims = 0;
    let resilienceOutageAdapterCalls = 0;
    const outageCountedControl: ProviderControlStore = { kind: 'redis', isReady: () => true, admit: async (request) => { resilienceOutageAdmits += 1; return controlStores[0]!.admit(request); }, claimExecution: async (reservation, token) => { resilienceOutageClaims += 1; return controlStores[0]!.claimExecution(reservation, token); }, settle: (reservation, status) => controlStores[0]!.settle(reservation, status), close: () => Promise.resolve() };
    const resilienceOutageResult = await executeProviderApiGateRequest({ ...liveRequest('resilience-outage'), region: 'resilience-outage' }, { ...adapter, fetchManaged: async (request: never) => { resilienceOutageAdapterCalls += 1; return fixture.fetch(request); } }, { cacheCoordinator: new ProviderCacheCoordinator(cacheStores[0]!), cachePolicyResolver: { resolve: async () => outageCachePolicy }, providerControlStore: outageCountedControl, policyResolver: { resolve: async () => openControlPolicy }, resilienceStore: resilienceOutageStore, resiliencePolicyResolver: { resolve: async () => outageResiliencePolicy }, credentialPoolId: 'primary' });
    assert.equal(resilienceOutageResult.decision.reason, 'provider_resilience_unavailable');
    assert.equal(resilienceOutageResult.decision.providerCallMode, 'blocked_live');
    assert.equal(resilienceOutageResult.settlementState, 'not_required');
    assert.deepEqual({ resilienceOutageAdapterCalls, resilienceOutageAdmits, resilienceOutageClaims }, { resilienceOutageAdapterCalls: 0, resilienceOutageAdmits: 0, resilienceOutageClaims: 0 });
    await resilienceOutageStore.close();

    const failurePolicy = buildTestProviderResiliencePolicy({ policyVersion: 'coalesced-failure', failureThreshold: 10, minimumObservations: 10 });
    const failureCachePolicy = buildTestProviderCachePolicy({ policyVersion: 'coalesced-failure', flightLeaseMs: 700, followerWaitTimeoutMs: 3_000 });
    const failureControlPolicy = buildTestProviderControlPolicy({ policyVersion: 'coalesced-failure', rate: { capacity: 5, refillAmount: 5, refillIntervalMs: 60_000, requestTokens: 1 }, quota: { kind: 'fixed_duration', limit: 5, windowMs: 60_000 }, cost: { kind: 'fixed_duration', budgetUnits: 5, windowMs: 60_000, requestCostUnits: 1 }, concurrency: { maxConcurrent: 2, leaseDurationMs: 700, providerTimeoutMs: 100 } });
    let failureAdmits = 0;
    let failureClaims = 0;
    let failureAdapterCalls = 0;
    let failureObservations = 0;
    const failureControl: ProviderControlStore = { kind: 'redis', isReady: () => true, admit: async (request) => { failureAdmits += 1; return controlStores[0]!.admit(request); }, claimExecution: async (reservation, token) => { failureClaims += 1; return controlStores[0]!.claimExecution(reservation, token); }, settle: (reservation, status) => controlStores[0]!.settle(reservation, status), close: () => Promise.resolve() };
    const failureResilience = { kind: 'redis' as const, isReady: () => resilienceStores[0]!.isReady(), acquire: (policy: typeof failurePolicy, token: string) => resilienceStores[0]!.acquire(policy, token), observe: (policy: typeof failurePolicy, outcome: ProviderResilienceOutcome, probe?: ProviderProbeLease) => { failureObservations += 1; return resilienceStores[0]!.observe(policy, outcome, probe); }, releaseProbe: (policy: typeof failurePolicy, probe: ProviderProbeLease) => resilienceStores[0]!.releaseProbe(policy, probe), close: () => Promise.resolve() };
    const failureCoordinator = new ProviderCacheCoordinator(cacheStores[0]!);
    const failureWave = await Promise.all(Array.from({ length: 100 }, (_, index) => executeProviderApiGateRequest({ ...liveRequest(`coalesced-failure-${index}`), region: 'coalesced-failure' }, { ...adapter, fetchManaged: async (request: never) => { failureAdapterCalls += 1; const value = await fixture.fetch(request); return { ...value, status: 'failed' as const, errorCode: 'provider_timeout', errorMessage: 'structured timeout', rawPayloadJson: null }; } }, { cacheCoordinator: failureCoordinator, cachePolicyResolver: { resolve: async () => failureCachePolicy }, providerControlStore: failureControl, policyResolver: { resolve: async () => failureControlPolicy }, resilienceStore: failureResilience, resiliencePolicyResolver: { resolve: async () => failurePolicy }, credentialPoolId: 'primary' })));
    assert.deepEqual({ callers: failureWave.length, owners: failureWave.filter((result) => result.cacheSnapshot?.singleFlightRole === 'owner').length, failureAdmits, failureClaims, failureAdapterCalls, failureObservations }, { callers: 100, owners: 1, failureAdmits: 1, failureClaims: 1, failureAdapterCalls: 1, failureObservations: 1 });

    const runHalfOpenGate = async (kind: 'success' | 'failure') => {
      const version = `half-open-${kind}`;
      const halfPolicy = buildTestProviderResiliencePolicy({ policyVersion: version, failureThreshold: 1, minimumObservations: 1, openDurationMs: 30, halfOpenMaxConcurrent: 1, probeLeaseMs: 500 });
      const halfCachePolicy = buildTestProviderCachePolicy({ policyVersion: version, flightLeaseMs: 700 });
      const halfControlPolicy = buildTestProviderControlPolicy({ policyVersion: version, rate: { capacity: 3, refillAmount: 3, refillIntervalMs: 60_000, requestTokens: 1 }, quota: { kind: 'fixed_duration', limit: 3, windowMs: 60_000 }, cost: { kind: 'fixed_duration', budgetUnits: 3, windowMs: 60_000, requestCostUnits: 1 }, concurrency: { maxConcurrent: 1, leaseDurationMs: 700, providerTimeoutMs: 100 } });
      await resilienceStores[0]!.observe(halfPolicy, { classification: 'provider_5xx' });
      await new Promise((resolve) => setTimeout(resolve, 35));
      let halfAdmits = 0;
      let halfClaims = 0;
      let halfCalls = 0;
      let halfObservations = 0;
      const halfControl: ProviderControlStore = { kind: 'redis', isReady: () => true, admit: async (request) => { halfAdmits += 1; return controlStores[0]!.admit(request); }, claimExecution: async (reservation, token) => { halfClaims += 1; return controlStores[0]!.claimExecution(reservation, token); }, settle: (reservation, status) => controlStores[0]!.settle(reservation, status), close: () => Promise.resolve() };
      const halfResilience = { kind: 'redis' as const, isReady: () => resilienceStores[0]!.isReady(), acquire: (policy: typeof halfPolicy, token: string) => resilienceStores[0]!.acquire(policy, token), observe: (policy: typeof halfPolicy, outcome: ProviderResilienceOutcome, probe?: ProviderProbeLease) => { halfObservations += 1; return resilienceStores[0]!.observe(policy, outcome, probe); }, releaseProbe: (policy: typeof halfPolicy, probe: ProviderProbeLease) => resilienceStores[0]!.releaseProbe(policy, probe), close: () => Promise.resolve() };
      const halfResult = await executeProviderApiGateRequest({ ...liveRequest(version), region: version }, { ...adapter, fetchManaged: async (request: never) => { halfCalls += 1; const value = await fixture.fetch(request); return kind === 'success' ? value : { ...value, status: 'failed' as const, errorCode: 'provider_timeout', errorMessage: 'provider timeout', rawPayloadJson: null }; } }, { cacheCoordinator: new ProviderCacheCoordinator(cacheStores[0]!), cachePolicyResolver: { resolve: async () => halfCachePolicy }, providerControlStore: halfControl, policyResolver: { resolve: async () => halfControlPolicy }, resilienceStore: halfResilience, resiliencePolicyResolver: { resolve: async () => halfPolicy }, credentialPoolId: 'primary' });
      assert.deepEqual({ halfAdmits, halfClaims, halfCalls, halfObservations }, { halfAdmits: 1, halfClaims: 1, halfCalls: 1, halfObservations: 1 });
      const halfKeys = providerResilienceKeys(halfPolicy, `${namespace}:resilience`);
      assert.equal(await resilienceClients[0]!.zCard(halfKeys.probes), 0);
      assert.equal(await resilienceClients[0]!.hGet(halfKeys.state, 'state'), kind === 'success' ? 'CLOSED' : 'OPEN');
      assert.equal(halfResult.decision.providerCallMode, 'live_staging_call');
      if (kind === 'failure') assert.equal((await resilienceStores[1]!.acquire(halfPolicy, 'blocked-after-failure')).reason, 'provider_resilience_open');
      else assert.equal((await resilienceStores[1]!.acquire(halfPolicy, 'normal-after-success')).reason, 'provider_resilience_closed');
    };
    await runHalfOpenGate('success');
    await runHalfOpenGate('failure');

    const ownershipLossPolicy = buildTestProviderResiliencePolicy({ policyVersion: 'post-transmission-excluded', failureThreshold: 1, minimumObservations: 1, openDurationMs: 30, halfOpenMaxConcurrent: 1, probeLeaseMs: 2_000 });
    const ownershipLossCachePolicy = buildTestProviderCachePolicy({ policyVersion: 'post-transmission-excluded', flightLeaseMs: 1_100, followerWaitTimeoutMs: 2_000 });
    const ownershipLossControlPolicy = buildTestProviderControlPolicy({ policyVersion: 'post-transmission-excluded', rate: { capacity: 2, refillAmount: 2, refillIntervalMs: 60_000, requestTokens: 1 }, quota: { kind: 'fixed_duration', limit: 2, windowMs: 60_000 }, cost: { kind: 'fixed_duration', budgetUnits: 2, windowMs: 60_000, requestCostUnits: 1 }, concurrency: { maxConcurrent: 1, leaseDurationMs: 1_000, providerTimeoutMs: 500 } });
    await resilienceStores[0]!.observe(ownershipLossPolicy, { classification: 'provider_5xx' });
    await new Promise((resolve) => setTimeout(resolve, 35));
    const ownershipLossKeys = providerResilienceKeys(ownershipLossPolicy, `${namespace}:resilience`);
    const ownershipLossRequest = { ...liveRequest('post-transmission-excluded'), region: 'post-transmission-excluded' };
    const ownershipLossIdentity = buildProviderCacheIdentity(ownershipLossRequest, ownershipLossCachePolicy, 'primary', buildProviderRequestFingerprint(ownershipLossRequest));
    let ownershipLossCalls = 0;
    let ownershipLossApplied: boolean | undefined;
    let beforeOwnershipLossHealth: Record<string,string> | undefined;
    const ownershipLossResilience = { kind: 'redis' as const, isReady: () => resilienceStores[0]!.isReady(), acquire: async (policy: typeof ownershipLossPolicy, token: string) => { const permission=await resilienceStores[0]!.acquire(policy, token); beforeOwnershipLossHealth=await resilienceClients[0]!.hGetAll(ownershipLossKeys.state); return permission; }, observe: async (policy: typeof ownershipLossPolicy, outcome: ProviderResilienceOutcome, probe?: ProviderProbeLease) => { const result = await resilienceStores[0]!.observe(policy, outcome, probe); ownershipLossApplied = result.applied; return result; }, releaseProbe: (policy: typeof ownershipLossPolicy, probe: ProviderProbeLease) => resilienceStores[0]!.releaseProbe(policy, probe), close: () => Promise.resolve() };
    const ownershipLossResult = await executeProviderApiGateRequest(ownershipLossRequest, { ...adapter, fetchManaged: async (_request: never, execution: { signal: AbortSignal }) => { ownershipLossCalls += 1; await cacheClients[0]!.del(`${namespace}:{${ownershipLossIdentity.hash}}:flight`); return new Promise<never>((_resolve, reject) => execution.signal.addEventListener('abort', () => reject(execution.signal.reason), { once: true })); } }, { cacheCoordinator: new ProviderCacheCoordinator(cacheStores[0]!), cachePolicyResolver: { resolve: async () => ownershipLossCachePolicy }, providerControlStore: controlStores[0]!, policyResolver: { resolve: async () => ownershipLossControlPolicy }, resilienceStore: ownershipLossResilience, resiliencePolicyResolver: { resolve: async () => ownershipLossPolicy }, credentialPoolId: 'primary' });
    assert.equal(ownershipLossCalls, 1);
    assert.equal(ownershipLossApplied, false);
    assert.equal(ownershipLossResult.settlementState, 'settled_unknown_outcome');
    assert.equal(ownershipLossResult.decision.providerCallMode, 'live_staging_call');
    assert.deepEqual(await resilienceClients[1]!.hGetAll(ownershipLossKeys.state), beforeOwnershipLossHealth);
    assert.equal(await resilienceClients[1]!.zCard(ownershipLossKeys.probes), 0);
    assert.equal((await resilienceStores[1]!.acquire(ownershipLossPolicy, 'post-transmission-successor')).reason, 'provider_resilience_probe');

    const runRetryAfterGate = async (label: string, retryAfterMs: unknown, expectedMinimum: number | null, expectedMaximum: number | null) => {
      const retryPolicy = buildTestProviderResiliencePolicy({ policyVersion: `retry-${label}`, failureThreshold: 5, minimumObservations: 5, openDurationMs: 20, retryAfter: { minimumMs: 40, maximumMs: 120 } });
      const retryCachePolicy = buildTestProviderCachePolicy({ policyVersion: `retry-${label}`, flightLeaseMs: 700 });
      const retryControlPolicy = buildTestProviderControlPolicy({ policyVersion: `retry-${label}`, rate: { capacity: 2, refillAmount: 2, refillIntervalMs: 60_000, requestTokens: 1 }, quota: { kind: 'fixed_duration', limit: 2, windowMs: 60_000 }, cost: { kind: 'fixed_duration', budgetUnits: 2, windowMs: 60_000, requestCostUnits: 1 }, concurrency: { maxConcurrent: 1, leaseDurationMs: 700, providerTimeoutMs: 100 } });
      const retryRequest = { ...liveRequest(`retry-${label}`), region: `retry-${label}` };
      await executeProviderApiGateRequest(retryRequest, { ...adapter, fetchManaged: async (request: never) => { const value = await fixture.fetch(request); return { ...value, status: 'failed' as const, errorCode: 'rate_limited', errorMessage: 'structured throttle', rawPayloadJson: null, retryAfterMs }; } }, { cacheCoordinator: new ProviderCacheCoordinator(cacheStores[0]!), cachePolicyResolver: { resolve: async () => retryCachePolicy }, providerControlStore: controlStores[0]!, policyResolver: { resolve: async () => retryControlPolicy }, resilienceStore: resilienceStores[0]!, resiliencePolicyResolver: { resolve: async () => retryPolicy }, credentialPoolId: 'primary' });
      const retryKeys = providerResilienceKeys(retryPolicy, `${namespace}:resilience`);
      const state = await resilienceClients[1]!.hGet(retryKeys.state, 'state');
      if (expectedMinimum === null || expectedMaximum === null) { assert.notEqual(state, 'OPEN'); return; }
      assert.equal(state, 'OPEN');
      const redisTime = await resilienceClients[1]!.sendCommand(['TIME']) as string[];
      const redisNow = Number(redisTime[0]) * 1_000 + Math.floor(Number(redisTime[1]) / 1_000);
      const remaining = Number(await resilienceClients[1]!.hGet(retryKeys.state, 'openUntil')) - redisNow;
      assert.ok(remaining >= expectedMinimum && remaining <= expectedMaximum, `${label} bounded shared Retry-After: ${remaining}`);
      assert.ok(await resilienceClients[1]!.pTTL(retryKeys.state) >= remaining, `${label} state TTL must cover shared backoff`);
      assert.equal((await resilienceStores[1]!.acquire(retryPolicy, `retry-observer-${label}`)).reason, 'provider_resilience_open');
    };
    await runRetryAfterGate('valid', 60, 35, 65);
    await runRetryAfterGate('below-min', 1, 15, 45);
    await runRetryAfterGate('above-max', 999, 90, 125);
    await runRetryAfterGate('negative', -1, null, null);
    await runRetryAfterGate('string', '60', null, null);
    await runRetryAfterGate('overflow', Number.MAX_VALUE, null, null);

    const runStaleOpenGate = async (allowed: boolean) => {
      const version = `stale-open-${allowed ? 'allowed' : 'prohibited'}`;
      const stalePolicy = buildTestProviderResiliencePolicy({ policyVersion: version, failureThreshold: 1, minimumObservations: 1, openDurationMs: 5_000, allowStaleWhileOpen: allowed });
      const staleCachePolicy = buildTestProviderCachePolicy({ policyVersion: version, freshTtlMs: 20, staleIfErrorTtlMs: 500, flightLeaseMs: 700 });
      const staleControlPolicy = buildTestProviderControlPolicy({ policyVersion: version, rate: { capacity: 2, refillAmount: 2, refillIntervalMs: 60_000, requestTokens: 1 }, quota: { kind: 'fixed_duration', limit: 2, windowMs: 60_000 }, cost: { kind: 'fixed_duration', budgetUnits: 2, windowMs: 60_000, requestCostUnits: 1 }, concurrency: { maxConcurrent: 1, leaseDurationMs: 700, providerTimeoutMs: 100 } });
      const staleRequest = { ...liveRequest(version), region: version };
      const staleIdentity = buildProviderCacheIdentity(staleRequest, staleCachePolicy, 'primary', buildProviderRequestFingerprint(staleRequest));
      const staleToken = `${version}-owner`;
      assert.equal(await cacheStores[0]!.tryAcquireFlight(staleIdentity, staleToken, staleCachePolicy.flightLeaseMs), true);
      const staleUnsigned = { ...unsigned, fingerprint: staleIdentity.fingerprint, cachePolicyVersion: staleCachePolicy.policyVersion, cachePolicyHash: staleCachePolicy.canonicalPolicyHash };
      assert.equal((await cacheStores[0]!.publishSuccessAndComplete(staleIdentity, staleToken, { ...staleUnsigned, materialIntegrityHash: hashProviderCachedMaterial(staleUnsigned) }, staleCachePolicy)).published, true);
      await new Promise((resolve) => setTimeout(resolve, 25));
      await resilienceStores[0]!.observe(stalePolicy, { classification: 'provider_5xx' });
      let staleAdmits = 0;
      let staleClaims = 0;
      let staleCalls = 0;
      const staleControl: ProviderControlStore = { kind: 'redis', isReady: () => true, admit: async (request) => { staleAdmits += 1; return controlStores[0]!.admit(request); }, claimExecution: async (reservation, token) => { staleClaims += 1; return controlStores[0]!.claimExecution(reservation, token); }, settle: (reservation, status) => controlStores[0]!.settle(reservation, status), close: () => Promise.resolve() };
      const result = await executeProviderApiGateRequest(staleRequest, { ...adapter, fetchManaged: async (request: never) => { staleCalls += 1; return fixture.fetch(request); } }, { cacheCoordinator: new ProviderCacheCoordinator(cacheStores[0]!), cachePolicyResolver: { resolve: async () => staleCachePolicy }, providerControlStore: staleControl, policyResolver: { resolve: async () => staleControlPolicy }, resilienceStore: resilienceStores[0]!, resiliencePolicyResolver: { resolve: async () => stalePolicy }, credentialPoolId: 'primary' });
      assert.deepEqual({ staleCalls, staleAdmits, staleClaims }, { staleCalls: 0, staleAdmits: 0, staleClaims: 0 });
      assert.equal(result.decision.providerCallMode, 'blocked_live');
      assert.equal(result.settlementState, 'not_required');
      if (allowed) { assert.ok(result.response); assert.equal(result.cacheSnapshot?.freshness, 'stale'); assert.equal(result.decision.reason, 'provider_resilience_stale_fallback'); }
      else { assert.equal(result.response, null); assert.equal(result.decision.reason, 'provider_resilience_open'); }
    };
    await runStaleOpenGate(true);
    await runStaleOpenGate(false);

    const runBlockedStaleGate = async (mode: 'probe-limit' | 'outage', allowed: boolean) => {
      const version = `stale-${mode}-${allowed ? 'allowed' : 'prohibited'}`;
      const blockedPolicy = buildTestProviderResiliencePolicy({ policyVersion: version, failureThreshold: 1, minimumObservations: 1, openDurationMs: 30, probeLeaseMs: 2_000, halfOpenMaxConcurrent: 1, allowStaleWhileOpen: allowed });
      const blockedCachePolicy = buildTestProviderCachePolicy({ policyVersion: version, freshTtlMs: 20, staleIfErrorTtlMs: 500, flightLeaseMs: 700 });
      const blockedControlPolicy = buildTestProviderControlPolicy({ policyVersion: version, rate: { capacity: 2, refillAmount: 2, refillIntervalMs: 60_000, requestTokens: 1 }, quota: { kind: 'fixed_duration', limit: 2, windowMs: 60_000 }, cost: { kind: 'fixed_duration', budgetUnits: 2, windowMs: 60_000, requestCostUnits: 1 }, concurrency: { maxConcurrent: 1, leaseDurationMs: 700, providerTimeoutMs: 100 } });
      const blockedRequest = { ...liveRequest(version), region: version };
      const blockedIdentity = buildProviderCacheIdentity(blockedRequest, blockedCachePolicy, 'primary', buildProviderRequestFingerprint(blockedRequest));
      const token = `${version}-cache-owner`;
      assert.equal(await cacheStores[0]!.tryAcquireFlight(blockedIdentity, token, blockedCachePolicy.flightLeaseMs), true);
      const blockedUnsigned = { ...unsigned, fingerprint: blockedIdentity.fingerprint, cachePolicyVersion: blockedCachePolicy.policyVersion, cachePolicyHash: blockedCachePolicy.canonicalPolicyHash };
      assert.equal((await cacheStores[0]!.publishSuccessAndComplete(blockedIdentity, token, { ...blockedUnsigned, materialIntegrityHash: hashProviderCachedMaterial(blockedUnsigned) }, blockedCachePolicy)).published, true);
      await new Promise((resolve) => setTimeout(resolve, 25));
      let blockedStore: RedisProviderResilienceStore = resilienceStores[0]!;
      let outageStore: RedisProviderResilienceStore | undefined;
      if (mode === 'probe-limit') { await resilienceStores[0]!.observe(blockedPolicy, { classification: 'provider_5xx' }); await new Promise((resolve) => setTimeout(resolve, 35)); assert.equal((await resilienceStores[1]!.acquire(blockedPolicy, `${version}-occupied`)).reason, 'provider_resilience_probe'); }
      else { const outageClient = createProviderResilienceRedisClient({ url: 'redis://127.0.0.1:1', connectTimeoutMs: 30 }); outageStore = new RedisProviderResilienceStore(outageClient, `${namespace}:${version}:outage`, 50); blockedStore = outageStore; }
      let blockedAdmits = 0;
      let blockedClaims = 0;
      let blockedCalls = 0;
      const blockedControl: ProviderControlStore = { kind: 'redis', isReady: () => true, admit: async (request) => { blockedAdmits += 1; return controlStores[0]!.admit(request); }, claimExecution: async (reservation, executionToken) => { blockedClaims += 1; return controlStores[0]!.claimExecution(reservation, executionToken); }, settle: (reservation, status) => controlStores[0]!.settle(reservation, status), close: () => Promise.resolve() };
      const result = await executeProviderApiGateRequest(blockedRequest, { ...adapter, fetchManaged: async (request: never) => { blockedCalls += 1; return fixture.fetch(request); } }, { cacheCoordinator: new ProviderCacheCoordinator(cacheStores[0]!), cachePolicyResolver: { resolve: async () => blockedCachePolicy }, providerControlStore: blockedControl, policyResolver: { resolve: async () => blockedControlPolicy }, resilienceStore: blockedStore, resiliencePolicyResolver: { resolve: async () => blockedPolicy }, credentialPoolId: 'primary' });
      assert.deepEqual({ blockedCalls, blockedAdmits, blockedClaims }, { blockedCalls: 0, blockedAdmits: 0, blockedClaims: 0 });
      assert.equal(result.decision.providerCallMode, 'blocked_live');
      assert.equal(result.settlementState, 'not_required');
      if (mode === 'probe-limit' && allowed) { assert.ok(result.response); assert.equal(result.cacheSnapshot?.freshness, 'stale'); assert.equal(result.decision.reason, 'provider_resilience_stale_fallback'); }
      else { assert.equal(result.response, null); assert.equal(result.decision.reason, mode === 'probe-limit' ? 'provider_resilience_probe_limit' : 'provider_resilience_unavailable'); }
      await outageStore?.close();
    };
    await runBlockedStaleGate('probe-limit', false);
    await runBlockedStaleGate('probe-limit', true);
    await runBlockedStaleGate('outage', true);

    console.log(`provider cache Redis integration passed: local_requests=1000 cross_requests=200 adapter_calls=${adapterCalls} admits=${admits} claims=${claims} freshness=FRESH>STALE>MISS byte_limit=exact completion=sanitized generation=clean`);
  } finally {
    for (const client of [...cacheClients, ...controlClients, ...resilienceClients]) {
      if (client.isOpen) {
        const found = await client.keys(`${namespace}:*`);
        if (found.length) await client.del(found);
      }
    }
    await Promise.all([...cacheStores.map((store) => store.close()), ...controlStores.map((store) => store.close()), ...resilienceStores.map((store) => store.close())]);
  }
}
