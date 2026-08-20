import { createHash } from 'node:crypto';
import { canonicalizeProviderControlValue } from '../provider-control/policy';
import type { ProviderCachePolicy } from './contracts';
const SAFE=/^[a-zA-Z0-9._*-]{1,100}$/;
const LIMITS={ttl:86_400_000,wait:300_000,bytes:1_048_576};
export function hashProviderCachePolicy(policy:Omit<ProviderCachePolicy,'canonicalPolicyHash'>):string{return `sha256:${createHash('sha256').update(canonicalizeProviderControlValue(policy)).digest('hex')}`;}
export function validateProviderCachePolicy(policy:ProviderCachePolicy,now=Date.now()):void{
 for(const v of [policy.policyId,policy.policyVersion,policy.sourceId,policy.capabilityId,policy.credentialPoolId])if(!SAFE.test(v))throw new Error('provider_cache_policy_invalid_identity');
 const from=Date.parse(policy.effectiveFrom),to=policy.effectiveTo===null?null:Date.parse(policy.effectiveTo);if(!Number.isFinite(from)||(to!==null&&(!Number.isFinite(to)||to<=from))||from>now||(to!==null&&to<=now))throw new Error('provider_cache_policy_inactive');
 const values=[policy.freshTtlMs,policy.flightLeaseMs,policy.followerWaitTimeoutMs,policy.completionTtlMs,policy.maxEntryBytes];if(values.some(v=>!Number.isSafeInteger(v)||v<=0)||!Number.isSafeInteger(policy.staleIfErrorTtlMs)||policy.staleIfErrorTtlMs<0)throw new Error('provider_cache_policy_invalid_integer');
 if(policy.freshTtlMs>LIMITS.ttl||policy.staleIfErrorTtlMs>LIMITS.ttl||policy.flightLeaseMs>LIMITS.wait||policy.followerWaitTimeoutMs>LIMITS.wait||policy.completionTtlMs>60_000||policy.maxEntryBytes>LIMITS.bytes||policy.completionTtlMs>policy.followerWaitTimeoutMs)throw new Error('provider_cache_policy_out_of_bounds');
 const unsigned=Object.fromEntries(Object.entries(policy).filter(([k])=>k!=='canonicalPolicyHash')) as Omit<ProviderCachePolicy,'canonicalPolicyHash'>;if(hashProviderCachePolicy(unsigned)!==policy.canonicalPolicyHash)throw new Error('provider_cache_policy_hash_mismatch');
}
export function assertProviderCachePolicyAuthority(policy:ProviderCachePolicy,request:{sourceId:string;capabilityId:string},pool:string,now=Date.now()):void{validateProviderCachePolicy(policy,now);if(policy.status!=='approved')throw new Error('provider_cache_policy_not_approved');if(policy.sourceId!==request.sourceId||(policy.capabilityId!==request.capabilityId&&policy.capabilityId!=='*')||policy.credentialPoolId!==pool)throw new Error('provider_cache_policy_scope_mismatch');}
