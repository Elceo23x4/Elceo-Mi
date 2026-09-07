import type { ProviderCapabilityId } from './provider-api-gate';
import type { ProviderCachePolicy, ProviderCachePolicyResolver, ProviderPayloadStorageMode } from './provider-cache';
import { hashProviderCachePolicy } from './provider-cache';
import type { ProviderControlPolicy, ProviderControlPolicyResolver } from './provider-control';
import { hashProviderControlPolicy } from './provider-control';
import type { ProviderResiliencePolicy, ProviderResiliencePolicyResolver } from './provider-resilience';
import { providerResiliencePolicyHash } from './provider-resilience';

export type ProviderEvaluationProfile = {
  profileId: string; profileVersion: string; sourceId: string; capabilityId: ProviderCapabilityId;
  credentialPoolId: string; entitlementClass: 'evaluation_only'; payloadStorageMode: ProviderPayloadStorageMode;
  productionAllowed: false; durablePayloadStorageAllowed: false; customerDisplayAllowed: false;
  allowedAssets: readonly string[]; policyProvenance: string;
};

const PROVENANCE = 'ELCEO internal safety ceiling; not an upstream Tiingo plan limit. Operator review 2026-09-07.';
export const TIINGO_EVALUATION_PROFILE: ProviderEvaluationProfile = Object.freeze({
  profileId: 'tiingo_evaluation_certification', profileVersion: 'p1b-v1', sourceId: 'tiingo_market_data',
  capabilityId: 'market_price_history', credentialPoolId: 'evaluation_free', entitlementClass: 'evaluation_only',
  payloadStorageMode: 'evaluation_no_store', productionAllowed: false, durablePayloadStorageAllowed: false,
  customerDisplayAllowed: false, allowedAssets: Object.freeze(['eur_usd']), policyProvenance: PROVENANCE,
});

export function resolveProviderEvaluationProfile(sourceId: string, capabilityId: string, asset: string): ProviderEvaluationProfile | null {
  const p = TIINGO_EVALUATION_PROFILE;
  return sourceId === p.sourceId && capabilityId === p.capabilityId && p.allowedAssets.includes(asset) ? p : null;
}

const effectiveFrom = '2026-01-01T00:00:00.000Z';
const cacheBody: Omit<ProviderCachePolicy, 'canonicalPolicyHash'> = {
  policyId:'tiingo-evaluation-cache', policyVersion:'p1b-v1', status:'approved', sourceId:'tiingo_market_data',
  capabilityId:'market_price_history', credentialPoolId:'evaluation_free', effectiveFrom, effectiveTo:null,
  provenance:PROVENANCE, payloadStorageMode:'evaluation_no_store', freshTtlMs:0, staleIfErrorTtlMs:0,
  maxEntryBytes:0, flightLeaseMs:12_000, followerWaitTimeoutMs:15_000, completionTtlMs:5_000,
};
export const TIINGO_EVALUATION_CACHE_POLICY: ProviderCachePolicy = Object.freeze({...cacheBody, canonicalPolicyHash:hashProviderCachePolicy(cacheBody)});
const controlBody: Omit<ProviderControlPolicy, 'canonicalPolicyHash'> = {
  policyId:'tiingo-evaluation-control', policyVersion:'p1b-v1', status:'approved', sourceId:'tiingo_market_data', capabilityId:'market_price_history', credentialPoolId:'evaluation_free', effectiveFrom, effectiveTo:null, provenance:PROVENANCE,
  rate:{capacity:1,refillAmount:1,refillIntervalMs:60_000,requestTokens:1}, quota:{kind:'fixed_duration',limit:3,windowMs:86_400_000}, cost:{kind:'fixed_duration',budgetUnits:3,requestCostUnits:1,windowMs:86_400_000}, concurrency:{maxConcurrent:1,providerTimeoutMs:5_000,leaseDurationMs:10_000},
};
export const TIINGO_EVALUATION_CONTROL_POLICY: ProviderControlPolicy = Object.freeze({...controlBody,canonicalPolicyHash:hashProviderControlPolicy(controlBody)});
const resilienceBody: Omit<ProviderResiliencePolicy,'canonicalPolicyHash'> = {
  policyId:'tiingo-evaluation-resilience',policyVersion:'p1b-v1',sourceId:'tiingo_market_data',capabilityId:'market_price_history',credentialPoolId:'evaluation_free',status:'approved',effectiveFrom,effectiveTo:null,provenance:PROVENANCE,
  failureWindow:{kind:'fixed_window',windowMs:60_000},failureThreshold:1,minimumObservations:1,openDurationMs:60_000,halfOpenMaxConcurrent:1,probeLeaseMs:10_000,retryAfter:{minimumMs:1_000,maximumMs:60_000},eligibleFailures:['provider_network','provider_timeout','provider_5xx','provider_throttled','other_provider_failure'],allowStaleWhileOpen:false,stateTtlMs:86_400_000,
};
export const TIINGO_EVALUATION_RESILIENCE_POLICY: ProviderResiliencePolicy = Object.freeze({...resilienceBody,canonicalPolicyHash:providerResiliencePolicyHash(resilienceBody)});

function matches(scope:{sourceId:string;capabilityId:string;credentialPoolId:string}) { return scope.sourceId==='tiingo_market_data'&&scope.capabilityId==='market_price_history'&&scope.credentialPoolId==='evaluation_free'; }
export const evaluationCachePolicyResolver: ProviderCachePolicyResolver = {async resolve(scope){return matches(scope)?TIINGO_EVALUATION_CACHE_POLICY:null;}};
export const evaluationProviderControlPolicyResolver: ProviderControlPolicyResolver = {async resolve(scope){return matches(scope)?TIINGO_EVALUATION_CONTROL_POLICY:null;}};
export const evaluationResiliencePolicyResolver: ProviderResiliencePolicyResolver = {async resolve(scope){return matches(scope)?TIINGO_EVALUATION_RESILIENCE_POLICY:null;}};
