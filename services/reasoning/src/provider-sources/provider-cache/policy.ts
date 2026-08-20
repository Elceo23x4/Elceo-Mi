import { createHash } from 'node:crypto';
import type { ProviderControlPolicy } from '../provider-control/contracts';
import {
  canonicalizeProviderControlValue,
  PROVIDER_SETTLEMENT_SAFETY_MARGIN_MS,
} from '../provider-control/policy';
import type { ProviderCachePolicy } from './contracts';

const SAFE = /^[a-zA-Z0-9._*-]{1,100}$/;
const LIMITS = { ttl: 86_400_000, wait: 300_000, bytes: 1_048_576 };
export const PROVIDER_CACHE_COMPLETION_SAFETY_MARGIN_MS = 250;
export const PROVIDER_CACHE_MINIMUM_FLIGHT_LEASE_MS = 100;

export function hashProviderCachePolicy(
  policy: Omit<ProviderCachePolicy, 'canonicalPolicyHash'>,
): string {
  return `sha256:${createHash('sha256').update(canonicalizeProviderControlValue(policy)).digest('hex')}`;
}

export function validateProviderCachePolicy(policy: ProviderCachePolicy, now = Date.now()): void {
  for (const value of [
    policy.policyId,
    policy.policyVersion,
    policy.sourceId,
    policy.capabilityId,
    policy.credentialPoolId,
  ]) {
    if (!SAFE.test(value)) throw new Error('provider_cache_policy_invalid_identity');
  }
  const from = Date.parse(policy.effectiveFrom);
  const to = policy.effectiveTo === null ? null : Date.parse(policy.effectiveTo);
  if (
    !Number.isFinite(from) ||
    (to !== null && (!Number.isFinite(to) || to <= from)) ||
    from > now ||
    (to !== null && to <= now)
  ) {
    throw new Error('provider_cache_policy_inactive');
  }
  const positive = [
    policy.freshTtlMs,
    policy.flightLeaseMs,
    policy.followerWaitTimeoutMs,
    policy.completionTtlMs,
    policy.maxEntryBytes,
  ];
  if (
    positive.some((value) => !Number.isSafeInteger(value) || value <= 0) ||
    !Number.isSafeInteger(policy.staleIfErrorTtlMs) ||
    policy.staleIfErrorTtlMs < 0
  ) {
    throw new Error('provider_cache_policy_invalid_integer');
  }
  if (
    policy.freshTtlMs > LIMITS.ttl ||
    policy.staleIfErrorTtlMs > LIMITS.ttl ||
    policy.flightLeaseMs > LIMITS.wait ||
    policy.flightLeaseMs < PROVIDER_CACHE_MINIMUM_FLIGHT_LEASE_MS ||
    policy.followerWaitTimeoutMs > LIMITS.wait ||
    policy.completionTtlMs > 60_000 ||
    policy.maxEntryBytes > LIMITS.bytes ||
    policy.completionTtlMs > policy.followerWaitTimeoutMs
  ) {
    throw new Error('provider_cache_policy_out_of_bounds');
  }
  const unsigned = Object.fromEntries(
    Object.entries(policy).filter(([key]) => key !== 'canonicalPolicyHash'),
  ) as Omit<ProviderCachePolicy, 'canonicalPolicyHash'>;
  if (hashProviderCachePolicy(unsigned) !== policy.canonicalPolicyHash) {
    throw new Error('provider_cache_policy_hash_mismatch');
  }
}

export function assertProviderCachePolicyAuthority(
  policy: ProviderCachePolicy,
  request: { sourceId: string; capabilityId: string },
  pool: string,
  now = Date.now(),
): void {
  validateProviderCachePolicy(policy, now);
  if (policy.status !== 'approved') throw new Error('provider_cache_policy_not_approved');
  if (
    policy.sourceId !== request.sourceId ||
    (policy.capabilityId !== request.capabilityId && policy.capabilityId !== '*') ||
    policy.credentialPoolId !== pool
  ) {
    throw new Error('provider_cache_policy_scope_mismatch');
  }
}

export function validateProviderCacheControlLeaseInvariant(
  cachePolicy: ProviderCachePolicy,
  controlPolicy: ProviderControlPolicy,
): void {
  const requiredLeaseMs =
    controlPolicy.concurrency.providerTimeoutMs +
    PROVIDER_SETTLEMENT_SAFETY_MARGIN_MS +
    PROVIDER_CACHE_COMPLETION_SAFETY_MARGIN_MS;
  if (cachePolicy.flightLeaseMs <= requiredLeaseMs) {
    throw new Error('provider_cache_control_lease_invariant');
  }
  const heartbeatMs = providerCacheHeartbeatIntervalMs(cachePolicy);
  if (heartbeatMs <= 0 || heartbeatMs >= cachePolicy.flightLeaseMs) {
    throw new Error('provider_cache_control_lease_invariant');
  }
}

export function providerCacheHeartbeatIntervalMs(policy: ProviderCachePolicy): number {
  return Math.max(25, Math.floor(policy.flightLeaseMs / 3));
}
