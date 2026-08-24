import { createHash } from 'node:crypto';
import type { ProviderHealthClassification, ProviderResiliencePolicy } from './contracts';

const INTEGER_FIELDS=['failureWindow.windowMs','failureThreshold','minimumObservations','openDurationMs','halfOpenMaxConcurrent','probeLeaseMs','retryAfter.minimumMs','retryAfter.maximumMs','stateTtlMs'] as const;
const ELIGIBLE_FAILURES = new Set<ProviderHealthClassification>(['provider_network','provider_timeout','provider_5xx','provider_throttled','other_provider_failure']);
export function providerResiliencePolicyHash(policy:Omit<ProviderResiliencePolicy,'canonicalPolicyHash'>):string{return `sha256:${createHash('sha256').update(JSON.stringify(policy)).digest('hex')}`;}
export function validateProviderResiliencePolicy(p:ProviderResiliencePolicy,now=Date.now()):void{
 const value=p as unknown as Record<string,unknown>,failureWindow=value.failureWindow as Record<string,unknown>|undefined,retryAfter=value.retryAfter as Record<string,unknown>|undefined;
 if(!p||typeof p!=='object'||!p.policyId||!p.policyVersion||!p.sourceId||!p.capabilityId||!p.credentialPoolId||!p.provenance)throw new Error('provider_resilience_policy_invalid_identity');
 if(failureWindow?.kind!=='fixed_window'||typeof p.allowStaleWhileOpen!=='boolean'||!Array.isArray(p.eligibleFailures)||p.eligibleFailures.some(item=>typeof item!=='string'||!ELIGIBLE_FAILURES.has(item))||new Set(p.eligibleFailures).size!==p.eligibleFailures.length)throw new Error('provider_resilience_policy_invalid_identity');
 for(const path of INTEGER_FIELDS){const candidate=path.split('.').reduce<unknown>((current,key)=>(current as Record<string,unknown>|undefined)?.[key],value);if(!Number.isSafeInteger(candidate)||Number(candidate)<=0)throw new Error('provider_resilience_policy_invalid_integer');}
 if(!retryAfter||p.minimumObservations<p.failureThreshold||p.retryAfter.minimumMs>p.retryAfter.maximumMs||p.failureWindow.windowMs>p.stateTtlMs||p.probeLeaseMs>p.stateTtlMs||p.openDurationMs>p.stateTtlMs||p.retryAfter.maximumMs>p.stateTtlMs)throw new Error('provider_resilience_policy_out_of_bounds');
 const from=Date.parse(p.effectiveFrom),to=p.effectiveTo?Date.parse(p.effectiveTo):Infinity;if(!Number.isFinite(from)||!(to>from))throw new Error('provider_resilience_policy_inactive');
 if(p.status!=='approved'||now<from||now>=to)throw new Error('provider_resilience_policy_not_approved');
 const {canonicalPolicyHash,...body}=p;if(providerResiliencePolicyHash(body)!==canonicalPolicyHash)throw new Error('provider_resilience_policy_hash_mismatch');
}
export function assertProviderResiliencePolicyAuthority(p:ProviderResiliencePolicy,sourceId:string,capabilityId:string,pool:string,now:number){validateProviderResiliencePolicy(p,now);if(p.sourceId!==sourceId||(p.capabilityId!=='*'&&p.capabilityId!==capabilityId)||p.credentialPoolId!==pool)throw new Error('provider_resilience_policy_scope_mismatch');}
export function parseProviderRetryAfterMs(value:unknown,p:ProviderResiliencePolicy):number|undefined{if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)return undefined;if(value<p.retryAfter.minimumMs)return p.retryAfter.minimumMs;if(value>p.retryAfter.maximumMs)return p.retryAfter.maximumMs;return value;}
