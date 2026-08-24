import type { ProviderCapabilityId, ProviderRuntimeRequest, ProviderApiGateExecutionResult } from '../provider-sources/provider-api-gate';

export type AdaptiveMaterializationPolicyStatus = 'approved' | 'test_only' | 'disabled';
export type AdaptiveMaterializationPolicy = {
  policyId: string; policyVersion: string; canonicalPolicyHash: string; status: AdaptiveMaterializationPolicyStatus;
  provenance: string; effectiveFrom: string; effectiveTo: string | null;
  sourceId: string; capabilityId: ProviderCapabilityId; credentialPoolId: string;
  asset: string; region: string | null; horizon: string;
  minimumRefreshIntervalMs: number; baseRefreshIntervalMs: number; maximumRefreshIntervalMs: number;
  staleAfterMs: number; retryMinimumMs: number; retryMaximumMs: number; leaseDurationMs: number;
  evaluationEpochMs: number; expectedReleaseMinuteUtc: number | null;
};
export type MaterializationLease = { jobHash: string; ownershipScope?:string; ownerToken: string; generation: number; acquiredAt: number; expiresAt: number };
export type LeaseAcquireResult = { acquired: true; lease: MaterializationLease } | { acquired: false; reason: 'adaptive_scheduler_not_due' | 'adaptive_scheduler_follower' | 'adaptive_scheduler_unavailable' };
export type CanonicalArtifact<T> = { schemaVersion: 'canonical_materialization_v1'; kind: 'evidence' | 'cognition'; identity: string; scopeHash: string; payload: T; evidenceIdentity: string; policyVersion: string; ruleVersions: readonly string[]; schedulerRunId: string; generatedAt: string; evaluatedAt: string; freshUntil: string; integrityHash: string };
export type CanonicalArtifactRead<T> = { state: 'available' | 'stale'; artifact: CanonicalArtifact<T> } | { state: 'unavailable'; artifact: null };
export type MaterializationRepository = { publish<T>(lease: MaterializationLease, artifact: CanonicalArtifact<T>): Promise<boolean>; readCurrent<T>(coordinationHash:string,scopeHash: string): Promise<CanonicalArtifactRead<T>>; getByIdentity<T>(identity: string): Promise<CanonicalArtifact<T> | null> };
export type AdaptiveOwnershipStore = { readonly kind: 'redis'; acquire(jobHash: string, ownerToken: string, leaseMs: number): Promise<LeaseAcquireResult>; acquireMaterialization(coordinationHash:string,ownershipScope:string,ownerToken:string,leaseMs:number):Promise<LeaseAcquireResult>; renew(lease: MaterializationLease, leaseMs: number): Promise<MaterializationLease | null>; complete(lease: MaterializationLease, nextDueAt: number): Promise<boolean>; defer(lease:MaterializationLease,nextDueAt:number):Promise<boolean>; publishCurrent(lease:MaterializationLease,scopeHash:string,identity:string):Promise<boolean>; readCurrentIdentity(coordinationHash:string,scopeHash:string):Promise<string|null>; release(lease: MaterializationLease): Promise<boolean>; isCurrent(lease: MaterializationLease): Promise<boolean>; close(): Promise<void> };
export type TrustedAdaptiveExecutionContext={credentialPoolId:string};
export type AdaptiveCadenceSignals = { evaluatedAt: number; lastPublishedAt: number | null; lastAttemptSucceeded: boolean | null; publishedNewEvidence: boolean; resilienceRetryAt: number | null; expectedReleaseAt: number | null };
export type ScheduledProviderExecutor = (request: ProviderRuntimeRequest) => Promise<ProviderApiGateExecutionResult>;
export type AdaptiveMaterializationMetrics = { scheduleEvaluations: number; jobsDue: number; leaseAcquired: number; leaseDenied: number; providerRefreshAttempted: number; providerCacheSatisfied: number; canonicalEvidencePublished: number; cognitionComputed: number; cognitionReused: number; previousMaterializationServed: number; failures: Record<string, number>; nextDueAt: number | null };
