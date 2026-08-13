import { createHash } from 'node:crypto';
import type { ProviderControlPolicy } from './contracts';

function stable(value:unknown):string { if(value===null||typeof value==='boolean'||typeof value==='string') return JSON.stringify(value); if(typeof value==='number'&&Number.isSafeInteger(value)) return String(value); if(Array.isArray(value)) return `[${value.map(stable).join(',')}]`; if(typeof value==='object'){ return `{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${stable(v)}`).join(',')}}`; } throw new Error('unsupported_canonical_value'); }
export function hashProviderControlPolicy(policy:Omit<ProviderControlPolicy,'canonicalPolicyHash'>):string { return `sha256:${createHash('sha256').update(stable(policy)).digest('hex')}`; }
export function validateProviderControlPolicy(policy:ProviderControlPolicy, now=Date.now()):void {
  const integers=[policy.rate.capacity,policy.rate.refillAmount,policy.rate.refillIntervalMs,policy.rate.requestTokens,policy.cost.budgetUnits,policy.cost.windowMs,policy.cost.requestCostUnits,policy.concurrency.maxConcurrent,policy.concurrency.leaseDurationMs,policy.concurrency.providerTimeoutMs,policy.quota?.limit,policy.quota?.windowMs].filter((v):v is number=>v!==undefined);
  if(integers.some(v=>!Number.isSafeInteger(v)||v<=0)) throw new Error('provider_control_policy_invalid_integer');
  if(policy.concurrency.providerTimeoutMs>=policy.concurrency.leaseDurationMs) throw new Error('provider_timeout_must_be_less_than_lease');
  if(policy.status==='disabled'||Date.parse(policy.effectiveFrom)>now||(policy.effectiveTo!==null&&Date.parse(policy.effectiveTo)<=now)) throw new Error('provider_control_policy_inactive');
  const unsigned=Object.fromEntries(Object.entries(policy).filter(([key])=>key!=='canonicalPolicyHash')) as Omit<ProviderControlPolicy,'canonicalPolicyHash'>; if(hashProviderControlPolicy(unsigned)!==policy.canonicalPolicyHash) throw new Error('provider_control_policy_hash_mismatch');
}
export { stable as canonicalizeProviderControlValue };
