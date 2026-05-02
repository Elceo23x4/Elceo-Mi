import type { SecurityActionKind, SecurityActorKind, SecurityDecision, SecurityRateLimitPolicy } from '@elceo/types';
import type { SecurityRateLimitRepository } from '../persistence/contracts';
import { getSecurityRateLimitWindow } from './constants';
import { SECURITY_RATE_LIMIT_POLICIES } from './rate-limit-policies';
import { toCompactJson } from './serialization';

const id = (...p: string[]) => p.join(':');

export class SecurityRateLimitService {
  constructor(private readonly repository: SecurityRateLimitRepository, private readonly policies: readonly SecurityRateLimitPolicy[] = SECURITY_RATE_LIMIT_POLICIES) {}

  async evaluateRateLimit(params: { actionKind: SecurityActionKind; actorKind: SecurityActorKind; actorId: string; subjectId?: string | null; nowIso: string; }): Promise<SecurityDecision> {
    const { actionKind, actorKind, actorId, subjectId = null, nowIso } = params;
    const policy = this.policies.find((p) => p.actionKind === actionKind);
    if (!policy) return { decisionId:id('rate',actionKind,actorKind,actorId,nowIso,'no_policy'), actionKind, actorKind, actorId, subjectId, status:'allowed', blockReason:null, idempotencyKey:null, rateLimitPolicyKey:null, currentCount:null, maxCount:null, decidedAt:nowIso, metadataJson:toCompactJson({ reason:'no_rate_limit_policy' }) };
    const scopedSubjectId = policy.subjectScoped ? subjectId : null;
    const scopedActorId = policy.actorScoped ? actorId : 'global';
    const { windowStart, windowEnd } = getSecurityRateLimitWindow(policy.window, nowIso);
    const counter = await this.repository.getCounter(policy.policyKey, actorKind, scopedActorId, scopedSubjectId, windowStart, windowEnd);
    const currentCount = counter?.count ?? 0;
    if (currentCount >= policy.maxCount) return { decisionId:id('rate',policy.policyKey,actorKind,scopedActorId,windowStart,'blocked'), actionKind, actorKind, actorId, subjectId, status:'blocked', blockReason:'rate_limit_exceeded', idempotencyKey:null, rateLimitPolicyKey:policy.policyKey, currentCount, maxCount:policy.maxCount, decidedAt:nowIso, metadataJson:toCompactJson({ windowStart, windowEnd }) };
    return { decisionId:id('rate',policy.policyKey,actorKind,scopedActorId,windowStart,'allowed'), actionKind, actorKind, actorId, subjectId, status:'allowed', blockReason:null, idempotencyKey:null, rateLimitPolicyKey:policy.policyKey, currentCount, maxCount:policy.maxCount, decidedAt:nowIso, metadataJson:toCompactJson({ windowStart, windowEnd }) };
  }

  async incrementRateLimit(params: { actionKind: SecurityActionKind; actorKind: SecurityActorKind; actorId: string; subjectId?: string | null; nowIso: string; }): Promise<void> {
    const policy = this.policies.find((p) => p.actionKind === params.actionKind);
    if (!policy) return;
    const scopedSubjectId = policy.subjectScoped ? (params.subjectId ?? null) : null;
    const scopedActorId = policy.actorScoped ? params.actorId : 'global';
    const { windowStart, windowEnd } = getSecurityRateLimitWindow(policy.window, params.nowIso);
    await this.repository.incrementCounter({ policyKey: policy.policyKey, actionKind: params.actionKind, actorKind: params.actorKind, actorId: scopedActorId, subjectId: scopedSubjectId, window: policy.window, windowStart, windowEnd, updatedAt: params.nowIso });
  }
}
