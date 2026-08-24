import type {
  ProviderCapabilityId,
  ProviderRuntimeRequest,
  ProviderRuntimeResponse,
} from '../provider-api-gate';

export type ProviderCachePolicyStatus = 'approved' | 'test_only' | 'disabled';
export type ProviderCachePolicy = {
  policyId: string;
  policyVersion: string;
  status: ProviderCachePolicyStatus;
  sourceId: string;
  capabilityId: ProviderCapabilityId | '*';
  credentialPoolId: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  provenance: string;
  canonicalPolicyHash: string;
  freshTtlMs: number;
  staleIfErrorTtlMs: number;
  flightLeaseMs: number;
  followerWaitTimeoutMs: number;
  completionTtlMs: number;
  maxEntryBytes: number;
};
export type ProviderCachePolicyResolver = {
  resolve(scope: {
    sourceId: string;
    capabilityId: ProviderCapabilityId;
    credentialPoolId: string;
    evaluatedAt: number;
  }): Promise<ProviderCachePolicy | null>;
};
export type ProviderCachedMaterial = {
  cacheSchemaVersion: 'provider_cached_material_v1';
  sourceId: string;
  capabilityId: ProviderCapabilityId;
  adapterId: `${string}_adapter`;
  fingerprint: string;
  receivedAt: string;
  payload: unknown;
  payloadSizeBytes: number;
  recordCount: number;
  revision?: string | null;
  duplicateProviderIds?: string[];
  duplicateRecordKeys?: string[];
  nullableFields?: string[];
  unknownFields?: string[];
  cachePolicyVersion: string;
  cachePolicyHash: string;
  materialIntegrityHash: string;
};
export type ProviderCacheEntry = {
  entrySchemaVersion: 'provider_cache_entry_v1';
  publishedAt: number;
  freshUntil: number;
  staleUntil: number;
  material: ProviderCachedMaterial;
};
export type ProviderCacheRead = {
  state: 'FRESH' | 'STALE_BUT_ELIGIBLE' | 'MISS' | 'INVALID';
  entry?: ProviderCacheEntry;
};
export type ProviderFlightCompletion = {
  state: 'failure';
  reason: ProviderSharedFailureReason;
  completedAt: number;
};
export type ProviderFlightState = {
  active: boolean;
  completion?: ProviderFlightCompletion;
};
export type ProviderCachePublication =
  | { published: true; entry: ProviderCacheEntry }
  | { published: false; reason: 'provider_cache_entry_too_large' | 'provider_singleflight_ownership_lost' };
export type ProviderCacheStore = {
  kind: 'redis';
  read(identity: ProviderCacheIdentity, policy: ProviderCachePolicy): Promise<ProviderCacheRead>;
  tryAcquireFlight(identity: ProviderCacheIdentity, ownerToken: string, leaseMs: number): Promise<boolean>;
  renewFlight(identity: ProviderCacheIdentity, ownerToken: string, leaseMs: number): Promise<boolean>;
  readFlightState(identity: ProviderCacheIdentity): Promise<ProviderFlightState>;
  publishSuccessAndComplete(
    identity: ProviderCacheIdentity,
    ownerToken: string,
    material: ProviderCachedMaterial,
    policy: ProviderCachePolicy,
  ): Promise<ProviderCachePublication>;
  publishFailureAndComplete(
    identity: ProviderCacheIdentity,
    ownerToken: string,
    reason: ProviderSharedFailureReason,
    ttlMs: number,
  ): Promise<boolean>;
  releaseOwnerSafely(identity: ProviderCacheIdentity, ownerToken: string): Promise<boolean>;
};
export type ProviderCacheIdentity = {
  hash: string;
  fingerprint: string;
  sourceId: string;
  capabilityId: ProviderCapabilityId;
  credentialPoolId: string;
  policyVersion: string;
};
export type ProviderCacheSnapshot = {
  cacheKeyHash: string;
  cacheLayer: 'l1' | 'l2' | 'none';
  freshness: 'fresh' | 'stale' | 'miss';
  ageMs: number | null;
  freshUntil: number | null;
  staleUntil: number | null;
  singleFlightRole: 'owner' | 'follower' | 'none';
  singleFlightOutcome: string;
  cachePolicyVersion: string;
};
export type ProviderSharedFailureReason =
  | 'provider_cache_control_unavailable'
  | 'provider_cache_control_lease_invariant'
  | 'provider_cache_entry_too_large'
  | 'provider_cache_local_capacity_exceeded'
  | 'provider_control_denied'
  | 'provider_error'
  | 'provider_rate_limited'
  | 'provider_resilience_open'
  | 'provider_resilience_policy_hash_mismatch'
  | 'provider_resilience_policy_inactive'
  | 'provider_resilience_policy_invalid_identity'
  | 'provider_resilience_policy_invalid_integer'
  | 'provider_resilience_policy_missing'
  | 'provider_resilience_policy_not_approved'
  | 'provider_resilience_policy_out_of_bounds'
  | 'provider_resilience_policy_scope_mismatch'
  | 'provider_resilience_probe_limit'
  | 'provider_resilience_unavailable'
  | 'provider_settlement_unconfirmed'
  | 'provider_singleflight_ownership_lost'
  | 'provider_singleflight_wait_timeout'
  | 'provider_validation_failed';
export type ProviderCacheSharedOutcome = {
  material?: ProviderCachedMaterial;
  failureReason?: ProviderSharedFailureReason;
  layer: 'l1' | 'l2' | 'none';
  freshness: 'fresh' | 'stale' | 'miss';
  role: 'owner' | 'follower' | 'none';
  entry?: ProviderCacheEntry;
};
export type ProviderCacheOwnerExecution = (signal: AbortSignal) => Promise<{
  response: ProviderRuntimeResponse | null;
  settlementState: string;
  result: unknown;
  failureReason?: ProviderSharedFailureReason;
}>;
export type ProviderCacheStaleFailureAuthorizer = (reason: ProviderSharedFailureReason) => boolean | Promise<boolean>;
export type ProviderCacheRequest = Pick<ProviderRuntimeRequest, 'requestId' | 'sourceId' | 'capabilityId'>;
