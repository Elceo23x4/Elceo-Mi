import { strict as assert } from 'assert';
import { MemorySecurityAuditEventRepository, MemorySecurityIdempotencyRepository, MemorySecurityRateLimitRepository } from '../persistence/security-runtime-repository';
import { SecurityAuditService } from '../security/audit-service';
import { SecurityDecisionService } from '../security/decision-service';
import { SecurityIdempotencyService } from '../security/idempotency-service';
import { SecurityQueryService } from '../security/query-service';
import { SecurityRateLimitService } from '../security/rate-limit-service';
import { CanonicalSecurityBoundaryService } from '../runtime/canonical-security-boundary';

export async function runSecurityRuntimeCoreTests(): Promise<void> {
  const now = '2026-05-02T10:00:00.000Z';
  const idRepo = new MemorySecurityIdempotencyRepository();
  const rateRepo = new MemorySecurityRateLimitRepository();
  const auditRepo = new MemorySecurityAuditEventRepository();
  const idSvc = new SecurityIdempotencyService(idRepo);
  const rateSvc = new SecurityRateLimitService(rateRepo);
  const auditSvc = new SecurityAuditService(auditRepo);
  const decisionSvc = new SecurityDecisionService(idSvc, rateSvc, auditSvc);
  const querySvc = new SecurityQueryService(auditRepo);

  assert.equal((await idSvc.beginIdempotentAction({ actionKind:'refresh_run', actorKind:'user', actorId:'u', idempotencyKey:'k1', requestHash:'h1', nowIso:now })).status,'allowed');
  assert.equal((await idSvc.beginIdempotentAction({ actionKind:'refresh_run', actorKind:'user', actorId:'u', idempotencyKey:'k1', requestHash:'h1', nowIso:now })).status,'blocked');
  await idSvc.completeIdempotentAction({ idempotencyKey:'k1', responseHash:'rh1', nowIso:now });
  assert.equal((await idSvc.beginIdempotentAction({ actionKind:'refresh_run', actorKind:'user', actorId:'u', idempotencyKey:'k1', requestHash:'h1', nowIso:now })).status,'replayed');
  assert.equal((await idSvc.beginIdempotentAction({ actionKind:'refresh_run', actorKind:'user', actorId:'u', idempotencyKey:'k1', requestHash:'h2', nowIso:now })).blockReason,'suspicious_replay');
  await idSvc.failIdempotentAction({ idempotencyKey:'k1', nowIso:now });

  assert.equal((await rateSvc.evaluateRateLimit({ actionKind:'account_read', actorKind:'user', actorId:'u', nowIso:now })).status, 'allowed');
  const rateAllowed = await rateSvc.evaluateRateLimit({ actionKind:'refresh_run', actorKind:'user', actorId:'u', nowIso:now });
  assert.equal(rateAllowed.status,'allowed');
  for (let i = 0; i < 60; i++) await rateSvc.incrementRateLimit({ actionKind:'refresh_run', actorKind:'user', actorId:'u', nowIso:now });
  assert.equal((await rateSvc.evaluateRateLimit({ actionKind:'refresh_run', actorKind:'user', actorId:'u', nowIso:now })).status,'blocked');

  const blocked = await decisionSvc.evaluateSecurityControl({ actionKind:'refresh_run', actorKind:null, actorId:null, nowIso:now });
  assert.equal(blocked.blockReason, 'missing_actor');
  const allowedInternal = await decisionSvc.evaluateSecurityControl({ actionKind:'internal_mutation', actorKind:'internal', actorId:'svc', nowIso:now });
  assert.equal(allowedInternal.status, 'allowed');

  const replayDecision = await decisionSvc.evaluateSecurityControl({ actionKind:'refresh_run', actorKind:'user', actorId:'u2', idempotencyKey:'k2', requestHash:'h2', nowIso:now });
  assert.equal(replayDecision.status,'allowed');
  await idSvc.completeIdempotentAction({ idempotencyKey:'k2', responseHash:'rh2', nowIso:now });
  const replay = await decisionSvc.evaluateSecurityControl({ actionKind:'refresh_run', actorKind:'user', actorId:'u2', idempotencyKey:'k2', requestHash:'h2', nowIso:now });
  assert.equal(replay.status,'replayed');

  const actorEvents = await querySvc.listRecentSecurityAuditEventsForActor('user', 'u2');
  assert.ok(actorEvents.length >= 1);
  const blockedEvents = await querySvc.listRecentBlockedSecurityEvents();
  assert.ok(blockedEvents.length >= 1);
  const summary = await querySvc.getSecurityRuntimeSummary();
  assert.ok(summary.totalAuditEvents >= 1);

  const boundary = new CanonicalSecurityBoundaryService();
  const boundaryDecision = await boundary.evaluateSecurityControl({ actionKind:'refresh_run', actorKind:'user', actorId:'b', nowIso: now });
  assert.equal(boundaryDecision.status, 'allowed');
}
