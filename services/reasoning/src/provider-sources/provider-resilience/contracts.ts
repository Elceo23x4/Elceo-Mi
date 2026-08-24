import type { ProviderCapabilityId, ProviderRuntimeRequest } from '../provider-api-gate';

export type ProviderResilienceState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export type ProviderHealthClassification = 'success'|'provider_network'|'provider_timeout'|'provider_5xx'|'provider_throttled'|'other_provider_failure'|'not_eligible';
export type ProviderResiliencePolicy = {
  policyId:string; policyVersion:string; sourceId:string; capabilityId:ProviderCapabilityId|'*'; credentialPoolId:string;
  status:'approved'|'test_only'|'disabled'; effectiveFrom:string; effectiveTo:string|null; provenance:string; canonicalPolicyHash:string;
  failureWindow:{kind:'fixed_window';windowMs:number}; failureThreshold:number; minimumObservations:number; openDurationMs:number;
  halfOpenMaxConcurrent:number; probeLeaseMs:number; retryAfter:{minimumMs:number;maximumMs:number};
  eligibleFailures:Exclude<ProviderHealthClassification,'success'|'not_eligible'>[]; allowStaleWhileOpen:boolean; stateTtlMs:number;
};
export type ProviderResiliencePolicyResolver={resolve(scope:{sourceId:string;capabilityId:ProviderCapabilityId;credentialPoolId:string;evaluatedAt:number}):Promise<ProviderResiliencePolicy|null>};
export type ProviderResilienceScope=Pick<ProviderResiliencePolicy,'sourceId'|'capabilityId'|'credentialPoolId'|'policyId'|'policyVersion'>;
export type ProviderProbeLease={ownerToken:string;generation:number;expiresAt:number};
export type ProviderResilienceSnapshot={policyId:string;policyVersion:string;policyHash:string;state:ProviderResilienceState;generation:number;failureCount:number;observationCount:number;windowStartedAt:number|null;openUntil:number|null;probeActive:number;probeLeaseExpiresAt:number|null;classification:ProviderHealthClassification|null;reason:string};
export type ProviderResiliencePermission={allowed:true;reason:'provider_resilience_closed'|'provider_resilience_probe';probe?:ProviderProbeLease;snapshot:ProviderResilienceSnapshot}|{allowed:false;reason:'provider_resilience_open'|'provider_resilience_probe_limit'|'provider_resilience_unavailable';snapshot?:ProviderResilienceSnapshot};
export type ProviderResilienceOutcome={classification:ProviderHealthClassification;retryAfterMs?:number};
export interface ProviderResilienceStore {readonly kind:'memory'|'redis';isReady():boolean;acquire(policy:ProviderResiliencePolicy,ownerToken:string):Promise<ProviderResiliencePermission>;observe(policy:ProviderResiliencePolicy,outcome:ProviderResilienceOutcome,probe?:ProviderProbeLease):Promise<{applied:boolean;snapshot?:ProviderResilienceSnapshot}>;releaseProbe(policy:ProviderResiliencePolicy,probe:ProviderProbeLease):Promise<boolean>;close():Promise<void>}
export type ProviderResiliencePolicyResolutionRequest=Pick<ProviderRuntimeRequest,'sourceId'|'capabilityId'> & {credentialPoolId:string;evaluatedAt:number};
