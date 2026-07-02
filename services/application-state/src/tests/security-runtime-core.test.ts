import { strict as assert } from 'assert';
import { validateSecurityIdempotencyReplayResult, validateSecurityIdempotencyResponseRecord, validateSecurityRateLimitPolicy } from '@elceo/schemas';
import { MemorySecurityAuditEventRepository, MemorySecurityIdempotencyRepository, MemorySecurityIdempotencyResponseRepository, MemorySecurityRateLimitRepository } from '../persistence/security-runtime-repository';
import { SecurityAuditService } from '../security/audit-service';
import { SecurityDecisionService } from '../security/decision-service';
import { SecurityIdempotencyService } from '../security/idempotency-service';
import { SecurityQueryService } from '../security/query-service';
import { SECURITY_RATE_LIMIT_POLICIES } from '../security/rate-limit-policies';
import { SecurityRateLimitService } from '../security/rate-limit-service';
import { CanonicalSecurityBoundaryService } from '../runtime/canonical-security-boundary';

export async function runSecurityRuntimeCoreTests(): Promise<void> {
  const now = '2026-05-02T10:00:00.000Z';
  const idRepo = new MemorySecurityIdempotencyRepository();
  const responseRepo = new MemorySecurityIdempotencyResponseRepository();
  const rateRepo = new MemorySecurityRateLimitRepository();
  const auditRepo = new MemorySecurityAuditEventRepository();
  const idSvc = new SecurityIdempotencyService(idRepo, responseRepo);
  const rateSvc = new SecurityRateLimitService(rateRepo);
  const auditSvc = new SecurityAuditService(auditRepo);
  const decisionSvc = new SecurityDecisionService(idSvc, rateSvc, auditSvc);
  const querySvc = new SecurityQueryService(auditRepo, idSvc, responseRepo);

  await responseRepo.saveResponse({ idempotencyKey:'rk1', actionKind:'refresh_run', actorKind:'user', actorId:'u-response', requestHash:'h1', responseHash:'rh1', httpStatus:200, responseJson:'{"ok":true}', completedAt:'2026-05-02T09:00:00.000Z', expiresAt:'2026-05-02T12:00:00.000Z', metadataJson:'{}' });
  assert.deepEqual(await responseRepo.getResponse('rk1'), { idempotencyKey:'rk1', actionKind:'refresh_run', actorKind:'user', actorId:'u-response', requestHash:'h1', responseHash:'rh1', httpStatus:200, responseJson:'{"ok":true}', completedAt:'2026-05-02T09:00:00.000Z', expiresAt:'2026-05-02T12:00:00.000Z', metadataJson:'{}' });
  await responseRepo.saveResponse({ idempotencyKey:'rk2', actionKind:'refresh_run', actorKind:'user', actorId:'u-response', requestHash:'h2', responseHash:'rh2', httpStatus:201, responseJson:'{"ok":true,"n":2}', completedAt:'2026-05-02T09:30:00.000Z', expiresAt:'2026-05-02T12:30:00.000Z', metadataJson:'{}' });
  const ordered = await responseRepo.listResponsesForActor('user', 'u-response', 5);
  assert.equal(ordered[0]?.idempotencyKey, 'rk2');
  assert.equal(ordered[1]?.idempotencyKey, 'rk1');
  const cleaned = await responseRepo.cleanupExpiredResponses('2026-05-02T12:15:00.000Z');
  assert.equal(cleaned, 1);

  const newActionPolicyValidation = validateSecurityRateLimitPolicy({ policyKey: 'journal_case_write.hour.120', actionKind: 'journal_case_write', window: 'hour', maxCount: 120, subjectScoped: false, actorScoped: true });
  assert.equal(newActionPolicyValidation.ok, true);
  assert.equal(validateSecurityRateLimitPolicy({ policyKey: 'invalid.hour.1', actionKind: 'not_real_action_kind', window: 'hour', maxCount: 1, subjectScoped: false, actorScoped: true }).ok, false);

  await idSvc.beginIdempotentAction({ actionKind:'refresh_run', actorKind:'user', actorId:'u-replay', idempotencyKey:'k-replay', requestHash:'h-replay', nowIso:now });
  await idSvc.completeIdempotentActionWithResponse({ idempotencyKey:'k-replay', actionKind:'refresh_run', actorKind:'user', actorId:'u-replay', requestHash:'h-replay', responseHash:'rh-replay', httpStatus:200, responseJson:'{"ok":true}', completedAt:now });
  const replayFound = await idSvc.getReplayForIdempotencyKey({ idempotencyKey:'k-replay', requestHash:'h-replay', asOfIso:'2026-05-02T10:30:00.000Z' });
  assert.equal(replayFound.reason, 'completed_response_found');
  assert.equal(replayFound.replayable, true);

  await idSvc.beginIdempotentAction({ actionKind:'refresh_run', actorKind:'user', actorId:'u-replay', idempotencyKey:'k-missing', requestHash:'h-missing', nowIso:now });
  await idSvc.completeIdempotentAction({ idempotencyKey:'k-missing', responseHash:'rh-missing', nowIso:now });
  assert.equal((await idSvc.getReplayForIdempotencyKey({ idempotencyKey:'k-missing', requestHash:'h-missing', asOfIso:now })).reason, 'no_completed_response');
  assert.equal((await idSvc.getReplayForIdempotencyKey({ idempotencyKey:'k-replay', requestHash:'wrong', asOfIso:now })).reason, 'request_hash_mismatch');
  await responseRepo.saveResponse({ idempotencyKey:'k-exp', actionKind:'refresh_run', actorKind:'user', actorId:'u-replay', requestHash:'h-exp', responseHash:'rh-exp', httpStatus:200, responseJson:'{"ok":true}', completedAt:'2026-05-02T08:00:00.000Z', expiresAt:'2026-05-02T09:00:00.000Z', metadataJson:'{}' });
  await idRepo.saveIdempotencyRecord({ idempotencyKey:'k-exp', actionKind:'refresh_run', actorKind:'user', actorId:'u-replay', requestHash:'h-exp', responseHash:'rh-exp', status:'completed', firstSeenAt:'2026-05-02T08:00:00.000Z', lastSeenAt:'2026-05-02T08:00:00.000Z', expiresAt:'2026-05-02T13:00:00.000Z', metadataJson:'{}' });
  assert.equal((await idSvc.getReplayForIdempotencyKey({ idempotencyKey:'k-exp', requestHash:'h-exp', asOfIso:now })).reason, 'expired');
  assert.equal((await idSvc.getReplayForIdempotencyKey({ idempotencyKey:'k-none', requestHash:'h-none', asOfIso:now })).reason, 'not_found');

  const completedRecord = await idRepo.getIdempotencyRecord('k-replay');
  assert.equal(completedRecord?.status, 'completed');
  assert.equal(completedRecord?.responseHash, 'rh-replay');
  const storedResponse = await responseRepo.getResponse('k-replay');
  assert.equal(storedResponse?.responseHash, 'rh-replay');

  const boundary = new CanonicalSecurityBoundaryService();
  await boundary.beginIdempotentAction({ actionKind:'refresh_run', actorKind:'user', actorId:'u-boundary', idempotencyKey:'k-boundary', requestHash:'h-boundary', nowIso:now });
  await boundary.completeIdempotentActionWithResponse({ idempotencyKey:'k-boundary', actionKind:'refresh_run', actorKind:'user', actorId:'u-boundary', requestHash:'h-boundary', responseHash:'rh-boundary', httpStatus:200, responseJson:'{"ok":true}', completedAt:now });
  const boundaryReplay = await boundary.getIdempotencyReplayResult('k-boundary', 'h-boundary', '2026-05-02T10:05:00.000Z');
  assert.equal(boundaryReplay.reason, 'completed_response_found');
  const boundaryList = await boundary.listIdempotencyResponsesForActor('user', 'u-boundary', 10);
  assert.ok(boundaryList.some((r) => r.idempotencyKey === 'k-boundary'));

  const policyMap = new Map(SECURITY_RATE_LIMIT_POLICIES.map((policy) => [policy.actionKind, policy]));
  assert.equal(policyMap.get('refresh_run')?.maxCount, 60);

  assert.equal((await rateSvc.evaluateRateLimit({ actionKind:'account_read', actorKind:'user', actorId:'u', nowIso:now })).status, 'allowed');
  const blocked = await decisionSvc.evaluateSecurityControl({ actionKind:'refresh_run', actorKind:null, actorId:null, nowIso:now });
  assert.equal(blocked.blockReason, 'missing_actor');

  const actorEvents = await querySvc.listRecentSecurityAuditEventsForActor('user', 'u-replay');
  assert.ok(actorEvents.length >= 0);

  const validResponseSchema = validateSecurityIdempotencyResponseRecord({ idempotencyKey:'sr1', actionKind:'refresh_run', actorKind:'user', actorId:'u', requestHash:'h', responseHash:'rh', httpStatus:200, responseJson:'{"ok":true}', completedAt:now, expiresAt:'2026-05-03T10:00:00.000Z', metadataJson:'{}' });
  assert.equal(validResponseSchema.ok, true);
  assert.equal(validateSecurityIdempotencyResponseRecord({ idempotencyKey:'sr2', actionKind:'refresh_run', actorKind:'user', actorId:'u', requestHash:'h', responseHash:'rh', httpStatus:99, responseJson:'{}', completedAt:now, expiresAt:'2026-05-03T10:00:00.000Z', metadataJson:'{}' }).ok, false);
  assert.equal(validateSecurityIdempotencyReplayResult({ replayable:false, idempotencyKey:'rk', httpStatus:null, responseJson:null, responseHash:null, reason:'wrong_reason' }).ok, false);


  const restartRepo = new MemorySecurityIdempotencyRepository();
  const restartSvc = new SecurityIdempotencyService(restartRepo);
  await restartRepo.saveIdempotencyRecord({ idempotencyKey:'k-failed-retry', actionKind:'admin_write', actorKind:'admin', actorId:'admin', requestHash:'h-retry', responseHash:null, status:'failed', firstSeenAt:now, lastSeenAt:now, expiresAt:'2026-05-03T10:00:00.000Z', metadataJson:'{}' });
  const concurrentRetries = await Promise.all([
    restartSvc.beginIdempotentAction({ actionKind:'admin_write', actorKind:'admin', actorId:'admin', idempotencyKey:'k-failed-retry', requestHash:'h-retry', nowIso:'2026-05-02T10:01:00.000Z' }),
    restartSvc.beginIdempotentAction({ actionKind:'admin_write', actorKind:'admin', actorId:'admin', idempotencyKey:'k-failed-retry', requestHash:'h-retry', nowIso:'2026-05-02T10:01:00.001Z' })
  ]);
  assert.equal(concurrentRetries.filter((decision) => decision.status === 'allowed').length, 1);
  assert.equal(concurrentRetries.filter((decision) => decision.blockReason === 'idempotency_conflict').length, 1);
  await restartRepo.saveIdempotencyRecord({ idempotencyKey:'k-failed-mismatch', actionKind:'admin_write', actorKind:'admin', actorId:'admin', requestHash:'h-a', responseHash:null, status:'failed', firstSeenAt:now, lastSeenAt:now, expiresAt:'2026-05-03T10:00:00.000Z', metadataJson:'{}' });
  const mismatchRestart = await restartSvc.beginIdempotentAction({ actionKind:'admin_write', actorKind:'admin', actorId:'admin', idempotencyKey:'k-failed-mismatch', requestHash:'h-b', nowIso:now });
  assert.equal(mismatchRestart.blockReason, 'suspicious_replay');

  const summary = await querySvc.getSecurityRuntimeSummary();
  assert.ok(summary.totalAuditEvents >= 0);
}
