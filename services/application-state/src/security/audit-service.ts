import type { SecurityActionKind, SecurityActorKind, SecurityAuditEvent, SecurityDecision } from '@elceo/types';
import type { SecurityAuditEventRepository } from '../persistence/contracts';
import { hashIpAddress, hashUserAgent } from './hashing';
import { toCompactJson } from './serialization';

const shouldAuditDecision = (decision: SecurityDecision): boolean =>
  decision.status === 'blocked' || decision.status === 'replayed' || ((decision.actionKind === 'internal_mutation' || decision.actionKind === 'admin_write') && decision.status === 'allowed');

export class SecurityAuditService {
  constructor(private readonly repository: SecurityAuditEventRepository) {}
  async recordSecurityAuditEvent(params: Omit<SecurityAuditEvent, 'ipHash' | 'userAgentHash'> & { ipAddress?: string | null; userAgent?: string | null }): Promise<void> {
    await this.repository.saveAuditEvent({ ...params, ipHash: params.ipAddress ? hashIpAddress(params.ipAddress) : null, userAgentHash: params.userAgent ? hashUserAgent(params.userAgent) : null });
  }
  async recordSecurityDecision(params: { decision: SecurityDecision; actorKind: SecurityActorKind; actorId: string; subjectId?: string | null; actionKind?: SecurityActionKind; routePath?: string | null; method?: string | null; ipAddress?: string | null; userAgent?: string | null; nowIso: string; }): Promise<void> {
    const { decision } = params;
    if (!shouldAuditDecision(decision)) return;
    const event: Omit<SecurityAuditEvent, 'ipHash' | 'userAgentHash'> & { ipAddress?: string | null; userAgent?: string | null } = {
      auditEventId: `audit:${decision.decisionId}:${params.nowIso}`,
      actorKind: params.actorKind,
      actorId: params.actorId,
      subjectId: params.subjectId ?? decision.subjectId,
      actionKind: params.actionKind ?? decision.actionKind,
      decisionStatus: decision.status,
      blockReason: decision.blockReason,
      routePath: params.routePath ?? null,
      method: params.method ?? null,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      idempotencyKey: decision.idempotencyKey,
      metadataJson: toCompactJson({ decisionId: decision.decisionId, rateLimitPolicyKey: decision.rateLimitPolicyKey }),
      occurredAt: params.nowIso,
      createdAt: params.nowIso
    };
    await this.recordSecurityAuditEvent(event);
  }
}
