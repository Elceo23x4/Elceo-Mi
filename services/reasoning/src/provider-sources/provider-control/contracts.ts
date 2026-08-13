export type ProviderControlPolicyVersion = string;
export type ProviderControlScope = { sourceId:string; capabilityId:string; credentialPoolId:string; policyVersion:ProviderControlPolicyVersion };
export type ProviderRatePolicy = { capacity:number; refillAmount:number; refillIntervalMs:number; requestTokens:number };
export type ProviderQuotaPolicy = { limit:number; windowMs:number };
export type ProviderCostPolicy = { budgetUnits:number; windowMs:number; requestCostUnits:number };
export type ProviderConcurrencyPolicy = { maxConcurrent:number; leaseDurationMs:number; providerTimeoutMs:number };
export type ProviderControlPolicy = ProviderControlScope & { policyId:string; status:'approved'|'test_only'|'disabled'; effectiveFrom:string; effectiveTo:string|null; provenance:string; canonicalPolicyHash:string; rate:ProviderRatePolicy; quota?:ProviderQuotaPolicy; cost:ProviderCostPolicy; concurrency:ProviderConcurrencyPolicy };
export type ProviderReservationStatus = 'RESERVED'|'COMMITTED'|'RELEASED'|'COMMIT_REQUIRED_UNKNOWN_OUTCOME';
export type ProviderAdmissionRequest = { requestId:string; ownerToken:string; fingerprint:string; policy:ProviderControlPolicy };
export type ProviderControlSnapshot = { scope:ProviderControlScope; rate:{capacity:number;remaining:number;retryAfterMs:number}; quota:null|{limit:number;used:number;remaining:number;windowStart:number;windowEnd:number;resetAt:number}; cost:{limit:number;reserved:number;committed:number;remaining:number;windowStart:number;windowEnd:number}; concurrency:{limit:number;active:number;leaseExpiresAt:number} };
export type ProviderReservation = { reservationId:string; ownerToken:string; status:ProviderReservationStatus; costUnits:number; snapshot:ProviderControlSnapshot };
export type ProviderAdmissionDecision = { allowed:true; reason:'provider_control_admitted'; reservation:ProviderReservation } | { allowed:false; reason:'provider_rate_exhausted'|'provider_quota_exhausted'|'provider_cost_exhausted'|'provider_concurrency_exhausted'|'provider_control_policy_missing'|'provider_control_unavailable'; retryAfterMs:number; snapshot?:ProviderControlSnapshot };
export interface ProviderControlStore { readonly kind:'memory'|'redis'; isReady():boolean; admit(request:ProviderAdmissionRequest):Promise<ProviderAdmissionDecision>; settle(reservation:ProviderReservation,status:Exclude<ProviderReservationStatus,'RESERVED'>):Promise<boolean>; close():Promise<void> }
