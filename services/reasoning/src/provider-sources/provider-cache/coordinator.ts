import { createHash, randomUUID } from 'node:crypto';
import type { ProviderRuntimeRequest } from '../provider-api-gate';
import type {
  ProviderCacheEntry,
  ProviderCacheIdentity,
  ProviderCacheOwnerExecution,
  ProviderCachePolicy,
  ProviderCacheSharedOutcome,
  ProviderCacheStore,
  ProviderSharedFailureReason,
} from './contracts';
import { materialFromResponse, validateCachedMaterial } from './material';
import { providerCacheHeartbeatIntervalMs } from './policy';

export class ProviderL1Cache {
  private readonly entries = new Map<string, { entry: ProviderCacheEntry; bytes: number }>();
  private bytes = 0;
  constructor(
    readonly maxEntries = 256,
    readonly maxBytes = 16 * 1024 * 1024,
  ) {}
  get(identity: ProviderCacheIdentity, policy: ProviderCachePolicy, now = Date.now()): ProviderCacheEntry | undefined {
    const value = this.entries.get(identity.hash);
    if (!value) return undefined;
    if (now > value.entry.freshUntil || !validateCachedMaterial(value.entry.material, identity, policy)) {
      this.delete(identity.hash);
      return undefined;
    }
    this.entries.delete(identity.hash);
    this.entries.set(identity.hash, value);
    return value.entry;
  }
  set(identity: ProviderCacheIdentity, entry: ProviderCacheEntry, policy: ProviderCachePolicy): void {
    const bytes = Buffer.byteLength(JSON.stringify(entry));
    if (bytes > policy.maxEntryBytes || bytes > this.maxBytes) return;
    this.delete(identity.hash);
    this.entries.set(identity.hash, { entry, bytes });
    this.bytes += bytes;
    while (this.entries.size > this.maxEntries || this.bytes > this.maxBytes) {
      this.delete(this.entries.keys().next().value!);
    }
  }
  private delete(key: string): void {
    const previous = this.entries.get(key);
    if (previous) this.bytes -= previous.bytes;
    this.entries.delete(key);
  }
  get size(): number {
    return this.entries.size;
  }
  get totalBytes(): number {
    return this.bytes;
  }
}

export function buildProviderCacheIdentity(
  request: ProviderRuntimeRequest,
  policy: ProviderCachePolicy,
  pool: string,
  fingerprint: string,
): ProviderCacheIdentity {
  const canonical = `provider_cache_identity_v1\0${request.sourceId}\0${request.capabilityId}\0${pool}\0${policy.policyVersion}\0${fingerprint}`;
  const hash = createHash('sha256').update(canonical).digest('hex');
  return {
    hash,
    fingerprint,
    sourceId: request.sourceId,
    capabilityId: request.capabilityId,
    credentialPoolId: pool,
    policyVersion: policy.policyVersion,
  };
}

export function sanitizeProviderSharedFailureReason(value: unknown): ProviderSharedFailureReason {
  const reason = typeof value === 'string' ? value : '';
  if (reason === 'provider_cache_control_unavailable') return reason;
  if (reason === 'provider_cache_control_lease_invariant') return reason;
  if (reason === 'provider_cache_entry_too_large') return reason;
  if (reason === 'provider_cache_local_capacity_exceeded') return reason;
  if (reason === 'provider_singleflight_ownership_lost') return reason;
  if (reason === 'provider_singleflight_wait_timeout') return reason;
  if (reason === 'settlement_unconfirmed') return 'provider_settlement_unconfirmed';
  if (reason === 'rate_limited' || reason.includes('rate_limit')) return 'provider_rate_limited';
  if (
    reason.includes('validation') ||
    reason.includes('schema') ||
    reason.includes('response_provenance') ||
    reason.includes('response_identity') ||
    reason === 'oversized_response' ||
    reason === 'unknown_response_fields' ||
    reason.startsWith('nullable_field_not_allowed')
  ) {
    return 'provider_validation_failed';
  }
  if (reason.startsWith('provider_control_')) return 'provider_control_denied';
  return 'provider_error';
}

export class ProviderCacheCoordinator {
  private readonly inflight = new Map<string, Promise<ProviderCacheSharedOutcome>>();
  constructor(
    readonly store: ProviderCacheStore,
    readonly l1 = new ProviderL1Cache(),
    readonly maxInflight = 1_024,
  ) {}
  get localInflightSize(): number {
    return this.inflight.size;
  }
  async execute(
    request: ProviderRuntimeRequest,
    identity: ProviderCacheIdentity,
    policy: ProviderCachePolicy,
    owner: ProviderCacheOwnerExecution,
  ): Promise<ProviderCacheSharedOutcome> {
    const hit = this.l1.get(identity, policy);
    if (hit) return { material: hit.material, layer: 'l1', freshness: 'fresh', role: 'none', entry: hit };
    const existing = this.inflight.get(identity.hash);
    if (existing) return { ...(await existing), role: 'follower' };
    if (this.inflight.size >= this.maxInflight) {
      return { failureReason: 'provider_cache_local_capacity_exceeded', layer: 'none', freshness: 'miss', role: 'none' };
    }
    const promise = this.distributed(request, identity, policy, owner);
    this.inflight.set(identity.hash, promise);
    try {
      return await promise;
    } finally {
      if (this.inflight.get(identity.hash) === promise) this.inflight.delete(identity.hash);
    }
  }
  private async verifiedStale(
    identity: ProviderCacheIdentity,
    policy: ProviderCachePolicy,
    role: 'owner' | 'follower',
  ): Promise<ProviderCacheSharedOutcome | null> {
    try {
      const current = await this.store.read(identity, policy);
      if (current.state !== 'STALE_BUT_ELIGIBLE' || !current.entry) return null;
      return { material: current.entry.material, layer: 'l2', freshness: 'stale', role, entry: current.entry };
    } catch {
      return null;
    }
  }
  private async failureOrStale(
    identity: ProviderCacheIdentity,
    policy: ProviderCachePolicy,
    role: 'owner' | 'follower',
    reason: unknown,
    hadStaleCandidate: boolean,
  ): Promise<ProviderCacheSharedOutcome> {
    if (hadStaleCandidate) {
      const stale = await this.verifiedStale(identity, policy, role);
      if (stale) return stale;
    }
    return {
      failureReason: sanitizeProviderSharedFailureReason(reason),
      layer: 'none',
      freshness: 'miss',
      role,
    };
  }
  private async distributed(
    _request: ProviderRuntimeRequest,
    identity: ProviderCacheIdentity,
    policy: ProviderCachePolicy,
    owner: ProviderCacheOwnerExecution,
  ): Promise<ProviderCacheSharedOutcome> {
    let hadStaleCandidate = false;
    try {
      const read = await this.store.read(identity, policy);
      if (read.state === 'FRESH' && read.entry) {
        this.l1.set(identity, read.entry, policy);
        return { material: read.entry.material, layer: 'l2', freshness: 'fresh', role: 'none', entry: read.entry };
      }
      hadStaleCandidate = read.state === 'STALE_BUT_ELIGIBLE';
    } catch {
      return { failureReason: 'provider_cache_control_unavailable', layer: 'none', freshness: 'miss', role: 'none' };
    }
    const token = randomUUID();
    const deadline = Date.now() + policy.followerWaitTimeoutMs;
    let role: 'owner' | 'follower' = 'follower';
    while (Date.now() < deadline) {
      try {
        if (await this.store.tryAcquireFlight(identity, token, policy.flightLeaseMs)) {
          role = 'owner';
          break;
        }
      } catch {
        return this.failureOrStale(identity, policy, 'follower', 'provider_cache_control_unavailable', hadStaleCandidate);
      }
      const elapsed = policy.followerWaitTimeoutMs - Math.max(0, deadline - Date.now());
      const backoff = Math.min(250, 25 * 2 ** Math.min(4, Math.floor(elapsed / 100)));
      await new Promise((resolve) => setTimeout(resolve, backoff + Math.floor(Math.random() * 20)));
      try {
        const read = await this.store.read(identity, policy);
        if (read.state === 'FRESH' && read.entry) {
          this.l1.set(identity, read.entry, policy);
          return { material: read.entry.material, layer: 'l2', freshness: 'fresh', role: 'follower', entry: read.entry };
        }
        hadStaleCandidate = read.state === 'STALE_BUT_ELIGIBLE';
        const state = await this.store.readFlightState(identity);
        if (state.completion) {
          return this.failureOrStale(identity, policy, 'follower', state.completion.reason, hadStaleCandidate);
        }
      } catch {
        return this.failureOrStale(identity, policy, 'follower', 'provider_cache_control_unavailable', hadStaleCandidate);
      }
    }
    if (role === 'follower') {
      // A follower deadline is not evidence that the owner failed. In
      // particular, a slow, healthy refresh does not authorize stale-if-error.
      return {
        failureReason: 'provider_singleflight_wait_timeout',
        layer: 'none',
        freshness: 'miss',
        role,
      };
    }
    const abort = new AbortController();
    let lost = false;
    const loseOwnership = (reason: ProviderSharedFailureReason) => {
      lost = true;
      if (!abort.signal.aborted) abort.abort(new Error(reason));
    };
    const heartbeat = setInterval(() => {
      void this.store
        .renewFlight(identity, token, policy.flightLeaseMs)
        .then((renewed) => {
          if (!renewed) loseOwnership('provider_singleflight_ownership_lost');
        })
        .catch(() => loseOwnership('provider_cache_control_unavailable'));
    }, providerCacheHeartbeatIntervalMs(policy));
    try {
      const executed = await owner(abort.signal);
      const response = executed.response;
      if (!lost && response?.payloadSchemaStatus === 'valid' && executed.settlementState === 'settled_committed') {
        const material = materialFromResponse(response, identity.fingerprint, policy);
        const publication = await this.store.publishSuccessAndComplete(identity, token, material, policy);
        if (publication.published) {
          this.l1.set(identity, publication.entry, policy);
          return { material, layer: 'none', freshness: 'fresh', role: 'owner', entry: publication.entry };
        }
        return this.failureOrStale(
          identity,
          policy,
          'owner',
          'reason' in publication ? publication.reason : 'provider_error',
          hadStaleCandidate,
        );
      }
      const reason = lost ? 'provider_singleflight_ownership_lost' : response?.error?.category ?? executed.settlementState;
      const safeReason = sanitizeProviderSharedFailureReason(reason);
      if (!lost) await this.store.publishFailureAndComplete(identity, token, safeReason, policy.completionTtlMs);
      return this.failureOrStale(identity, policy, 'owner', safeReason, hadStaleCandidate);
    } catch (error) {
      const reason = lost ? 'provider_singleflight_ownership_lost' : sanitizeProviderSharedFailureReason(error instanceof Error ? error.message : error);
      if (!lost) await this.store.publishFailureAndComplete(identity, token, reason, policy.completionTtlMs).catch(() => false);
      return this.failureOrStale(identity, policy, 'owner', reason, hadStaleCandidate);
    } finally {
      clearInterval(heartbeat);
    }
  }
}
