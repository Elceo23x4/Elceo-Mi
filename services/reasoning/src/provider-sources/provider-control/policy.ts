import { createHash } from 'node:crypto';
import type { ProviderControlPolicy, ProviderControlScope } from './contracts';

const SAFE=/^[a-zA-Z0-9._*-]{1,100}$/;
export function canonicalizeProviderControlValue(value:unknown):string {
  if(value===null||typeof value==='boolean'||typeof value==='string') return JSON.stringify(value);
  if(typeof value==='number'&&Number.isSafeInteger(value)) return String(value);
  if(Array.isArray(value)) return `[${value.map(canonicalizeProviderControlValue).join(',')}]`;
  if(typeof value==='object') return `{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonicalizeProviderControlValue(v)}`).join(',')}}`;
  throw new Error('unsupported_canonical_value');
}
export function hashProviderControlPolicy(policy:Omit<ProviderControlPolicy,'canonicalPolicyHash'>):string { return `sha256:${createHash('sha256').update(canonicalizeProviderControlValue(policy)).digest('hex')}`; }
export function validateProviderControlScope(scope:ProviderControlScope):void { for(const value of [scope.sourceId,scope.capabilityId,scope.credentialPoolId,scope.policyVersion]) if(!SAFE.test(value)) throw new Error('provider_control_policy_invalid_scope'); }
export function validateProviderControlPolicy(policy:ProviderControlPolicy,now=Date.now()):void {
  if(!policy.policyId.trim()||!policy.policyVersion.trim()||!policy.provenance.trim()) throw new Error('provider_control_policy_invalid_identity');
  validateProviderControlScope(policy);
  const from=Date.parse(policy.effectiveFrom),to=policy.effectiveTo===null?null:Date.parse(policy.effectiveTo);
  if(!Number.isFinite(from)||(to!==null&&!Number.isFinite(to))||(to!==null&&to<=from)) throw new Error('provider_control_policy_invalid_dates');
  const integers=[policy.rate.capacity,policy.rate.refillAmount,policy.rate.refillIntervalMs,policy.rate.requestTokens,policy.cost.budgetUnits,policy.cost.windowMs,policy.cost.requestCostUnits,policy.concurrency.maxConcurrent,policy.concurrency.leaseDurationMs,policy.concurrency.providerTimeoutMs,policy.quota?.limit,policy.quota?.windowMs].filter((v):v is number=>v!==undefined);
  if(integers.some(v=>!Number.isSafeInteger(v)||v<=0)) throw new Error('provider_control_policy_invalid_integer');
  if(policy.cost.kind!=='fixed_duration'||(policy.quota&&policy.quota.kind!=='fixed_duration')) throw new Error('provider_control_policy_unsupported_window');
  if(policy.concurrency.providerTimeoutMs>=policy.concurrency.leaseDurationMs) throw new Error('provider_timeout_must_be_less_than_lease');
  if(from>now||(to!==null&&to<=now)) throw new Error('provider_control_policy_inactive');
  const unsigned=Object.fromEntries(Object.entries(policy).filter(([key])=>key!=='canonicalPolicyHash')) as Omit<ProviderControlPolicy,'canonicalPolicyHash'>;
  if(hashProviderControlPolicy(unsigned)!==policy.canonicalPolicyHash) throw new Error('provider_control_policy_hash_mismatch');
}
export function assertLivePolicyAuthority(policy:ProviderControlPolicy,request:{sourceId:string;capabilityId:string},trustedPool:string,now=Date.now()):void {
  validateProviderControlPolicy(policy,now);
  if(policy.status!=='approved') throw new Error('provider_control_policy_not_approved');
  if(policy.sourceId!==request.sourceId||(policy.capabilityId!==request.capabilityId&&policy.capabilityId!=='*')||policy.credentialPoolId!==trustedPool) throw new Error('provider_control_policy_scope_mismatch');
}
export const PROVIDER_SETTLEMENT_SAFETY_MARGIN_MS=250;
export function validateProviderExecutionLease(policy:ProviderControlPolicy):void {if(policy.concurrency.providerTimeoutMs+PROVIDER_SETTLEMENT_SAFETY_MARGIN_MS>=policy.concurrency.leaseDurationMs)throw new Error('provider_control_lease_timeout_invariant');}
export function buildProviderAdmissionId(requestId:string):string { return `admission:sha256:${createHash('sha256').update(`elceo_provider_admission_v1\0${requestId}`).digest('hex')}`; }
