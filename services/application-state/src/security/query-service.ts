import type { SecurityActorKind, SecurityAuditEvent, SecurityRuntimeSummary } from '@elceo/types';
import type { SecurityAuditEventRepository } from '../persistence/contracts';

export class SecurityQueryService {
  constructor(private readonly repository: SecurityAuditEventRepository) {}
  listRecentSecurityAuditEventsForActor(actorKind: SecurityActorKind, actorId: string, limit?: number): Promise<SecurityAuditEvent[]> { return this.repository.listRecentAuditEventsForActor(actorKind, actorId, limit); }
  listRecentSecurityAuditEventsForSubject(subjectId: string, limit?: number): Promise<SecurityAuditEvent[]> { return this.repository.listRecentAuditEventsForSubject(subjectId, limit); }
  listRecentBlockedSecurityEvents(limit?: number): Promise<SecurityAuditEvent[]> { return this.repository.listRecentBlockedEvents(limit); }
  getSecurityRuntimeSummary(asOfIso?: string): Promise<SecurityRuntimeSummary> { return this.repository.getSecurityRuntimeSummary(asOfIso); }
}
