import type { SecurityDecision } from '@elceo/types';
import { SecurityAuditService } from './audit-service';
import { SecurityIdempotencyService } from './idempotency-service';
import { SecurityRateLimitService } from './rate-limit-service';
import { toCompactJson } from './serialization';

export class SecurityDecisionService {
  constructor(private readonly idempotency: SecurityIdempotencyService, private readonly rateLimit: SecurityRateLimitService, private readonly audit: SecurityAuditService) {}
  async evaluateSecurityControl(params: { actionKind: SecurityDecision['actionKind']; actorKind?: SecurityDecision['actorKind'] | null; actorId?: string | null; subjectId?: string | null; idempotencyKey?: string | null; requestHash?: string | null; routePath?: string | null; method?: string | null; ipAddress?: string | null; userAgent?: string | null; nowIso: string; incrementRateLimitOnAllow?: boolean; }): Promise<SecurityDecision> {
    const subjectId = params.subjectId ?? null;
    const routePath = params.routePath ?? null;
    const method = params.method ?? null;
    const ipAddress = params.ipAddress ?? null;
    const userAgent = params.userAgent ?? null;
    const idempotencyKey = params.idempotencyKey ?? null;
    const requestHash = params.requestHash ?? null;
    if (!params.actorKind || !params.actorId) {
      const decision: SecurityDecision = { decisionId:`sec:${params.actionKind}:missing_actor:${params.nowIso}`, actionKind:params.actionKind, actorKind:'system', actorId:'missing', subjectId, status:'blocked', blockReason:'missing_actor', idempotencyKey, rateLimitPolicyKey:null, currentCount:null, maxCount:null, decidedAt:params.nowIso, metadataJson:toCompactJson({ reason:'missing_actor' }) };
      await this.audit.recordSecurityDecision({ decision, actorKind:'system', actorId:'missing', subjectId, actionKind:params.actionKind, nowIso:params.nowIso, routePath, method, ipAddress, userAgent });
      return decision;
    }
    const idem = await this.idempotency.beginIdempotentAction({ actionKind: params.actionKind, actorKind: params.actorKind, actorId: params.actorId, subjectId, idempotencyKey, requestHash, nowIso: params.nowIso });
    if (idem.status === 'blocked' || idem.status === 'replayed') { await this.audit.recordSecurityDecision({ decision: idem, actorKind: params.actorKind, actorId: params.actorId, subjectId, nowIso: params.nowIso, routePath, method, ipAddress, userAgent }); return idem; }
    const rate = await this.rateLimit.evaluateRateLimit({ actionKind: params.actionKind, actorKind: params.actorKind, actorId: params.actorId, subjectId, nowIso: params.nowIso });
    if (rate.status === 'blocked') { await this.audit.recordSecurityDecision({ decision: rate, actorKind: params.actorKind, actorId: params.actorId, subjectId, nowIso: params.nowIso, routePath, method, ipAddress, userAgent }); return rate; }
    if (params.incrementRateLimitOnAllow ?? true) await this.rateLimit.incrementRateLimit({ actionKind: params.actionKind, actorKind: params.actorKind, actorId: params.actorId, subjectId, nowIso: params.nowIso });
    await this.audit.recordSecurityDecision({ decision: rate, actorKind: params.actorKind, actorId: params.actorId, subjectId, nowIso: params.nowIso, routePath, method, ipAddress, userAgent });
    return rate;
  }
}
