import { createHash } from 'node:crypto';
import type { ProviderResiliencePolicy } from './contracts';

const INTEGER_FIELDS=['failureWindow.windowMs','failureThreshold','minimumObservations','openDurationMs','halfOpenMaxConcurrent','probeLeaseMs','retryAfter.minimumMs','retryAfter.maximumMs','stateTtlMs'] as const;
export function providerResiliencePolicyHash(policy:Omit<ProviderResiliencePolicy,'canonicalPolicyHash'>):string{return `sha256:${createHash('sha256').update(JSON.stringify(policy)).digest('hex')}`;}
export function validateProviderResiliencePolicy(p:ProviderResiliencePolicy,now=Date.now()):void{
 if(!p.policyId||!p.policyVersion||!p.sourceId||!p.capabilityId||!p.credentialPoolId||!p.provenance)throw new Error('provider_resilience_policy_invalid_identity');
 for(const path of INTEGER_FIELDS){const value=path.split('.').reduce<unknown>((v,k)=>(v as Record<string,unknown>)?.[k],p);if(!Number.isSafeInteger(value)||Number(value)<=0)throw new Error('provider_resilience_policy_invalid_integer');}
 if(p.minimumObservations<p.failureThreshold||p.retryAfter.minimumMs>p.retryAfter.maximumMs||p.probeLeaseMs>p.stateTtlMs||p.openDurationMs>p.stateTtlMs)throw new Error('provider_resilience_policy_out_of_bounds');
 const from=Date.parse(p.effectiveFrom),to=p.effectiveTo?Date.parse(p.effectiveTo):Infinity;if(!Number.isFinite(from)||!(to>from))throw new Error('provider_resilience_policy_inactive');
 if(p.status!=='approved'||now<from||now>=to)throw new Error('provider_resilience_policy_not_approved');
 const {canonicalPolicyHash,...body}=p;if(providerResiliencePolicyHash(body)!==canonicalPolicyHash)throw new Error('provider_resilience_policy_hash_mismatch');
}
export function assertProviderResiliencePolicyAuthority(p:ProviderResiliencePolicy,sourceId:string,capabilityId:string,pool:string,now:number){validateProviderResiliencePolicy(p,now);if(p.sourceId!==sourceId||(p.capabilityId!=='*'&&p.capabilityId!==capabilityId)||p.credentialPoolId!==pool)throw new Error('provider_resilience_policy_scope_mismatch');}
export function parseProviderRetryAfterMs(value:unknown,p:ProviderResiliencePolicy):number|undefined{if(typeof value!=='number'||!Number.isSafeInteger(value)||value<0)return undefined;if(value<p.retryAfter.minimumMs)return p.retryAfter.minimumMs;if(value>p.retryAfter.maximumMs)return p.retryAfter.maximumMs;return value;}
