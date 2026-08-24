import { createHash } from 'node:crypto';
import type { AdaptiveMaterializationPolicy } from './contracts';

const integerFields = ['minimumRefreshIntervalMs','baseRefreshIntervalMs','maximumRefreshIntervalMs','staleAfterMs','retryMinimumMs','retryMaximumMs','leaseDurationMs','evaluationEpochMs'] as const;
const canonical = (p: Omit<AdaptiveMaterializationPolicy, 'canonicalPolicyHash'> | AdaptiveMaterializationPolicy) => JSON.stringify(p, Object.keys(p).filter(k=>k!=='canonicalPolicyHash').sort());
export const hashAdaptiveMaterializationPolicy = (p: Omit<AdaptiveMaterializationPolicy, 'canonicalPolicyHash'>): string => `sha256:${createHash('sha256').update(canonical(p)).digest('hex')}`;
export function createAdaptiveMaterializationPolicy(p: Omit<AdaptiveMaterializationPolicy, 'canonicalPolicyHash'>): AdaptiveMaterializationPolicy { return { ...p, canonicalPolicyHash: hashAdaptiveMaterializationPolicy(p) }; }
export function validateAdaptiveMaterializationPolicy(p: AdaptiveMaterializationPolicy, evaluatedAt = Date.now()): void {
  if (!p.policyId || !p.policyVersion || !p.provenance || !p.sourceId || !p.capabilityId || !p.credentialPoolId || !p.asset || !p.horizon) throw new Error('adaptive_policy_invalid_identity');
  if (p.status === 'disabled' || (p.status !== 'approved' && p.status !== 'test_only')) throw new Error('adaptive_policy_not_approved');
  const from=Date.parse(p.effectiveFrom),to=p.effectiveTo===null?null:Date.parse(p.effectiveTo);
  if (!Number.isFinite(from)||(to!==null&&!Number.isFinite(to))) throw new Error('adaptive_policy_invalid_effective_interval');
  if (from > evaluatedAt || (to !== null && to < evaluatedAt) || (to!==null&&to<from)) throw new Error('adaptive_policy_inactive');
  if (integerFields.some(k => !Number.isSafeInteger(p[k]) || p[k] <= 0) || (p.expectedReleaseMinuteUtc !== null && (!Number.isInteger(p.expectedReleaseMinuteUtc) || p.expectedReleaseMinuteUtc < 0 || p.expectedReleaseMinuteUtc > 1439))) throw new Error('adaptive_policy_invalid_integer');
  if (!(p.minimumRefreshIntervalMs <= p.baseRefreshIntervalMs && p.baseRefreshIntervalMs <= p.maximumRefreshIntervalMs && p.retryMinimumMs <= p.retryMaximumMs && p.retryMaximumMs <= p.maximumRefreshIntervalMs && p.leaseDurationMs < p.minimumRefreshIntervalMs && p.evaluationEpochMs <= p.staleAfterMs)) throw new Error('adaptive_policy_out_of_bounds');
  if (p.canonicalPolicyHash !== hashAdaptiveMaterializationPolicy(p)) throw new Error('adaptive_policy_hash_mismatch');
}
export function assertAdaptiveExecutionAuthority(p:AdaptiveMaterializationPolicy,request:{sourceId:string;capabilityId:string;asset?:string|null;region?:string|null;activationMode?:string},credentialPoolId:string,evaluatedAt=Date.now()):void{validateAdaptiveMaterializationPolicy(p,evaluatedAt);if(request.activationMode==='production_live_allowed')throw new Error('adaptive_production_live_disabled');if(request.activationMode==='staging_live_allowed'&&p.status!=='approved')throw new Error('adaptive_policy_staging_requires_approved');if(p.sourceId!==request.sourceId||p.capabilityId!==request.capabilityId||p.asset!==(request.asset??'')||p.region!==(request.region??null)||p.credentialPoolId!==credentialPoolId)throw new Error('adaptive_policy_scope_mismatch')}
