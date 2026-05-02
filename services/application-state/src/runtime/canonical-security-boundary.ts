import { getSecurityAuditEventRepository, getSecurityIdempotencyRepository, getSecurityIdempotencyResponseRepository, getSecurityRateLimitRepository } from '../persistence/security-runtime-repository';
import { SecurityAuditService } from '../security/audit-service';
import { SecurityDecisionService } from '../security/decision-service';
import { SecurityIdempotencyService } from '../security/idempotency-service';
import { SecurityQueryService } from '../security/query-service';
import { SecurityRateLimitService } from '../security/rate-limit-service';

export class CanonicalSecurityBoundaryService {
  private readonly idempotencyRepository = getSecurityIdempotencyRepository();
  private readonly idempotencyResponseRepository = getSecurityIdempotencyResponseRepository();
  private readonly rateLimitRepository = getSecurityRateLimitRepository();
  private readonly auditEventRepository = getSecurityAuditEventRepository();
  private readonly idempotencyService = new SecurityIdempotencyService(this.idempotencyRepository, this.idempotencyResponseRepository);
  private readonly rateLimitService = new SecurityRateLimitService(this.rateLimitRepository);
  private readonly auditService = new SecurityAuditService(this.auditEventRepository);
  private readonly decisionService = new SecurityDecisionService(this.idempotencyService, this.rateLimitService, this.auditService);
  private readonly queryService = new SecurityQueryService(this.auditEventRepository, this.idempotencyService, this.idempotencyResponseRepository);

  getRepositories() { return { idempotencyRepository: this.idempotencyRepository, idempotencyResponseRepository: this.idempotencyResponseRepository, rateLimitRepository: this.rateLimitRepository, auditEventRepository: this.auditEventRepository }; }
  evaluateSecurityControl(params: Parameters<SecurityDecisionService['evaluateSecurityControl']>[0]) { return this.decisionService.evaluateSecurityControl(params); }
  beginIdempotentAction(params: Parameters<SecurityIdempotencyService['beginIdempotentAction']>[0]) { return this.idempotencyService.beginIdempotentAction(params); }
  completeIdempotentAction(params: Parameters<SecurityIdempotencyService['completeIdempotentAction']>[0]) { return this.idempotencyService.completeIdempotentAction(params); }
  completeIdempotentActionWithResponse(params: Parameters<SecurityIdempotencyService['completeIdempotentActionWithResponse']>[0]) { return this.idempotencyService.completeIdempotentActionWithResponse(params); }
  failIdempotentAction(params: Parameters<SecurityIdempotencyService['failIdempotentAction']>[0]) { return this.idempotencyService.failIdempotentAction(params); }
  recordSecurityAuditEvent(params: Parameters<SecurityAuditService['recordSecurityAuditEvent']>[0]) { return this.auditService.recordSecurityAuditEvent(params); }
  listRecentSecurityAuditEventsForActor(actorKind: Parameters<SecurityQueryService['listRecentSecurityAuditEventsForActor']>[0], actorId: string, limit?: number) { return this.queryService.listRecentSecurityAuditEventsForActor(actorKind, actorId, limit); }
  listRecentSecurityAuditEventsForSubject(subjectId: string, limit?: number) { return this.queryService.listRecentSecurityAuditEventsForSubject(subjectId, limit); }
  listRecentBlockedSecurityEvents(limit?: number) { return this.queryService.listRecentBlockedSecurityEvents(limit); }
  getSecurityRuntimeSummary(asOfIso?: string) { return this.queryService.getSecurityRuntimeSummary(asOfIso); }
  getIdempotencyReplayResult(idempotencyKey: string, requestHash: string, asOfIso?: string) { return this.queryService.getIdempotencyReplayResult(idempotencyKey, requestHash, asOfIso); }
  listIdempotencyResponsesForActor(actorKind: Parameters<SecurityQueryService['listIdempotencyResponsesForActor']>[0], actorId: string, limit?: number) { return this.queryService.listIdempotencyResponsesForActor(actorKind, actorId, limit); }
}
