import type { SecurityActionKind, SecurityActorKind, SecurityDecision } from '@elceo/types';
import type { SecurityIdempotencyRepository } from '../persistence/contracts';
import { SECURITY_DEFAULT_IDEMPOTENCY_TTL_MS } from './constants';
import { toCompactJson } from './serialization';

type IdempotencyParams = { actionKind: SecurityActionKind; actorKind: SecurityActorKind; actorId: string; subjectId?: string | null; idempotencyKey?: string | null; requestHash?: string | null; nowIso: string; };
const id=(...p:string[])=>p.join(':');

export class SecurityIdempotencyService {
  constructor(private readonly repository: SecurityIdempotencyRepository) {}

  async beginIdempotentAction(params: IdempotencyParams): Promise<SecurityDecision> {
    const { actionKind, actorKind, actorId, subjectId = null, idempotencyKey = null, requestHash = null, nowIso } = params;
    if (!idempotencyKey || !requestHash) return { decisionId:id('sec',actionKind,actorKind,actorId,nowIso,'non_idempotent'), actionKind, actorKind, actorId, subjectId, status:'allowed', blockReason:null, idempotencyKey:null, rateLimitPolicyKey:null, currentCount:null, maxCount:null, decidedAt:nowIso, metadataJson:toCompactJson({ reason: 'idempotency_not_required' }) };
    const existing = await this.repository.getIdempotencyRecord(idempotencyKey);
    if (!existing) {
      await this.repository.saveIdempotencyRecord({ idempotencyKey, actionKind, actorKind, actorId, requestHash, responseHash:null, status:'started', firstSeenAt:nowIso, lastSeenAt:nowIso, expiresAt:new Date(Date.parse(nowIso)+SECURITY_DEFAULT_IDEMPOTENCY_TTL_MS).toISOString(), metadataJson:toCompactJson({ state:'started' }) });
      return { decisionId:id('sec',actionKind,actorKind,actorId,idempotencyKey,'allowed_started'), actionKind, actorKind, actorId, subjectId, status:'allowed', blockReason:null, idempotencyKey, rateLimitPolicyKey:null, currentCount:null, maxCount:null, decidedAt:nowIso, metadataJson:toCompactJson({ reason:'idempotency_started' }) };
    }
    if (existing.requestHash !== requestHash) return { decisionId:id('sec',actionKind,actorKind,actorId,idempotencyKey,'hash_mismatch'), actionKind, actorKind, actorId, subjectId, status:'blocked', blockReason:'suspicious_replay', idempotencyKey, rateLimitPolicyKey:null, currentCount:null, maxCount:null, decidedAt:nowIso, metadataJson:toCompactJson({ reason:'request_hash_mismatch' }) };
    if (existing.status === 'completed') return { decisionId:id('sec',actionKind,actorKind,actorId,idempotencyKey,'replayed'), actionKind, actorKind, actorId, subjectId, status:'replayed', blockReason:null, idempotencyKey, rateLimitPolicyKey:null, currentCount:null, maxCount:null, decidedAt:nowIso, metadataJson:toCompactJson({ reason:'idempotency_replay_completed' }) };
    return { decisionId:id('sec',actionKind,actorKind,actorId,idempotencyKey,existing.status), actionKind, actorKind, actorId, subjectId, status:'blocked', blockReason:'idempotency_conflict', idempotencyKey, rateLimitPolicyKey:null, currentCount:null, maxCount:null, decidedAt:nowIso, metadataJson:toCompactJson({ reason:`idempotency_${existing.status}` }) };
  }

  async completeIdempotentAction(params: { idempotencyKey: string; responseHash: string; nowIso: string; metadata?: Record<string, unknown> }): Promise<void> {
    await this.repository.completeIdempotencyRecord(params.idempotencyKey, params.responseHash, toCompactJson(params.metadata ?? { state: 'completed' }), params.nowIso);
  }

  async failIdempotentAction(params: { idempotencyKey: string; nowIso: string; metadata?: Record<string, unknown> }): Promise<void> {
    await this.repository.failIdempotencyRecord(params.idempotencyKey, toCompactJson(params.metadata ?? { state: 'failed' }), params.nowIso);
  }
}
