import type { SecurityActorKind, SecurityAuditEvent, SecurityIdempotencyReplayResult, SecurityIdempotencyResponseRecord, SecurityRuntimeSummary } from '@elceo/types';
import type { SecurityAuditEventRepository, SecurityIdempotencyResponseRepository } from '../persistence/contracts';
import { SecurityIdempotencyService } from './idempotency-service';

export class SecurityQueryService {
  constructor(private readonly repository: SecurityAuditEventRepository, private readonly idempotencyService?: SecurityIdempotencyService, private readonly idempotencyResponseRepository?: SecurityIdempotencyResponseRepository) {}
  listRecentSecurityAuditEventsForActor(actorKind: SecurityActorKind, actorId: string, limit?: number): Promise<SecurityAuditEvent[]> { return this.repository.listRecentAuditEventsForActor(actorKind, actorId, limit); }
  listRecentSecurityAuditEventsForSubject(subjectId: string, limit?: number): Promise<SecurityAuditEvent[]> { return this.repository.listRecentAuditEventsForSubject(subjectId, limit); }
  listRecentBlockedSecurityEvents(limit?: number): Promise<SecurityAuditEvent[]> { return this.repository.listRecentBlockedEvents(limit); }
  getSecurityRuntimeSummary(asOfIso?: string): Promise<SecurityRuntimeSummary> { return this.repository.getSecurityRuntimeSummary(asOfIso); }
  getIdempotencyReplayResult(idempotencyKey:string, requestHash:string, asOfIso?:string): Promise<SecurityIdempotencyReplayResult> { if(!this.idempotencyService){ throw new Error('Idempotency service unavailable'); } return this.idempotencyService.getReplayForIdempotencyKey({ idempotencyKey, requestHash, asOfIso: asOfIso ?? new Date().toISOString() }); }
  listIdempotencyResponsesForActor(actorKind:SecurityActorKind, actorId:string, limit?:number): Promise<SecurityIdempotencyResponseRecord[]> { if(!this.idempotencyResponseRepository){ throw new Error('Idempotency response repository unavailable'); } return this.idempotencyResponseRepository.listResponsesForActor(actorKind, actorId, limit); }
}
