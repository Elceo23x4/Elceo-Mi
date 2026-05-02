import { strict as assert } from 'assert';
import { validateSecurityRateLimitPolicy } from '@elceo/schemas';
import { hashIpAddress, hashRequestBody } from '../security/hashing';
import { getSecurityRateLimitWindow } from '../security/constants';
import { MemorySecurityAuditEventRepository, MemorySecurityIdempotencyRepository, MemorySecurityRateLimitRepository } from '../persistence/security-runtime-repository';

export async function runSecurityRuntimeCoreTests(): Promise<void> {
  const good = validateSecurityRateLimitPolicy({ policyKey: 'p', actionKind: 'refresh_run', window: 'hour', maxCount: 1, subjectScoped: false, actorScoped: true });
  assert.equal(good.ok, true);
  assert.equal(validateSecurityRateLimitPolicy({ policyKey: 'p', actionKind: 'refresh_run', window: 'bad', maxCount: 1, subjectScoped: false, actorScoped: true }).ok, false);
  assert.equal(validateSecurityRateLimitPolicy({ policyKey: 'p', actionKind: 'refresh_run', window: 'hour', maxCount: -1, subjectScoped: false, actorScoped: true }).ok, false);

  assert.equal(hashRequestBody('abc'), hashRequestBody('abc'));
  assert.notEqual(hashRequestBody('abc'), hashRequestBody('abcd'));
  assert.notEqual(hashIpAddress('1.1.1.1'), hashIpAddress('2.2.2.2'));

  assert.deepEqual(getSecurityRateLimitWindow('minute', '2026-05-02T10:22:33.456Z'), { windowStart: '2026-05-02T10:22:00.000Z', windowEnd: '2026-05-02T10:23:00.000Z' });
  assert.deepEqual(getSecurityRateLimitWindow('hour', '2026-05-02T10:22:33.456Z'), { windowStart: '2026-05-02T10:00:00.000Z', windowEnd: '2026-05-02T11:00:00.000Z' });
  assert.deepEqual(getSecurityRateLimitWindow('day', '2026-05-02T10:22:33.456Z'), { windowStart: '2026-05-02T00:00:00.000Z', windowEnd: '2026-05-03T00:00:00.000Z' });

  const idRepo = new MemorySecurityIdempotencyRepository();
  await idRepo.saveIdempotencyRecord({ idempotencyKey:'k',actionKind:'refresh_run',actorKind:'user',actorId:'u',requestHash:'rq',responseHash:null,status:'started',firstSeenAt:'2026-05-02T00:00:00.000Z',lastSeenAt:'2026-05-02T00:00:00.000Z',expiresAt:'2026-05-03T00:00:00.000Z',metadataJson:'{}' });
  assert.equal((await idRepo.getIdempotencyRecord('k'))?.status, 'started');
  await idRepo.completeIdempotencyRecord('k', 'rh', '{}', '2026-05-02T00:10:00.000Z');
  assert.equal((await idRepo.getIdempotencyRecord('k'))?.status, 'completed');
  await idRepo.failIdempotencyRecord('k', '{}', '2026-05-02T00:11:00.000Z');
  assert.equal((await idRepo.getIdempotencyRecord('k'))?.status, 'failed');
  assert.equal(await idRepo.cleanupExpiredIdempotencyRecords('2026-05-04T00:00:00.000Z'), 1);

  const rateRepo = new MemorySecurityRateLimitRepository();
  await rateRepo.upsertCounter({ counterId:'a',policyKey:'p',actionKind:'refresh_run',actorKind:'user',actorId:'u',subjectId:null,window:'hour',windowStart:'2026-05-02T00:00:00.000Z',windowEnd:'2026-05-02T01:00:00.000Z',count:2,updatedAt:'2026-05-02T00:00:01.000Z' });
  const inc = await rateRepo.incrementCounter({ policyKey:'p',actionKind:'refresh_run',actorKind:'user',actorId:'u',subjectId:null,window:'hour',windowStart:'2026-05-02T00:00:00.000Z',windowEnd:'2026-05-02T01:00:00.000Z',updatedAt:'2026-05-02T00:00:02.000Z' });
  assert.equal(inc.count, 3);
  assert.equal((await rateRepo.listCountersForActor('user', 'u', 1)).length, 1);

  const auditRepo = new MemorySecurityAuditEventRepository();
  await auditRepo.saveAuditEvent({ auditEventId:'2',actorKind:'user',actorId:'u',subjectId:null,actionKind:'refresh_run',decisionStatus:'blocked',blockReason:'rate_limit_exceeded',routePath:null,method:null,ipHash:null,userAgentHash:null,idempotencyKey:null,metadataJson:'{}',occurredAt:'2026-05-02T00:01:00.000Z',createdAt:'2026-05-02T00:01:00.000Z' });
  await auditRepo.saveAuditEvent({ auditEventId:'1',actorKind:'user',actorId:'u',subjectId:'s',actionKind:'refresh_run',decisionStatus:'replayed',blockReason:null,routePath:null,method:null,ipHash:null,userAgentHash:null,idempotencyKey:'k',metadataJson:'{}',occurredAt:'2026-05-02T00:02:00.000Z',createdAt:'2026-05-02T00:02:00.000Z' });
  assert.equal((await auditRepo.listRecentBlockedEvents()).length, 1);
  const summary=await auditRepo.getSecurityRuntimeSummary();
  assert.equal(summary.totalAuditEvents,2);
  assert.equal(summary.blockedDecisionCount,1);
}
