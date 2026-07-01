import assert from 'node:assert/strict';
import { __setDbPoolFactoryForTests, closeDbPool } from '../db/client';
import { CommercialPersistenceError } from '../persistence/commercial-persistence-error';
import { MemorySuperAdminCommercialRepository, SQLSuperAdminCommercialRepository, buildGiftRequestHash } from '../persistence/super-admin-commercial-repository';

const baseGift = { actorSuperAdminId: 'admin', targetUserId: 'target', duration: 'two_weeks' as const, reasonCode: 'commercial_support' as const, operatorNote: 'note', stepUpChallengeId: 'challenge-a', idempotencyKey: 'idem-1', requestedAt: '2026-01-01T00:00:00.000Z' };
const baseRetract = (giftRecordId: string) => ({ actorSuperAdminId: 'admin', targetUserId: 'target', giftRecordId, reasonCode: 'operator_correction' as const, operatorNote: 'retract', stepUpChallengeId: 'challenge-r', idempotencyKey: 'idem-r', requestedAt: '2026-01-02T00:00:00.000Z' });
const baseRestriction = { actorSuperAdminId: 'admin', targetUserId: 'target-r', restrictionKind: 'banned' as const, reasonCode: 'policy_violation' as const, operatorNote: 'restrict', stepUpChallengeId: 'challenge-x', idempotencyKey: 'idem-x', requestedAt: '2026-01-01T00:00:00.000Z' };

export async function runSuperAdminCommercialRepositoryTests() {
  const mem = new MemorySuperAdminCommercialRepository();
  const gift = await mem.createFocusPlanGiftAtomically(baseGift); assert.equal(gift.status, 'success', 'memory gift create succeeds');
  assert.equal((await mem.createFocusPlanGiftAtomically(baseGift)).giftRecord?.giftRecordId, gift.giftRecord?.giftRecordId, 'same-key gift replays exact resource');
  assert.equal((await mem.createFocusPlanGiftAtomically({ ...baseGift, duration: 'one_month' })).failureReason, 'idempotency_conflict', 'same key different gift request conflicts');
  assert.equal((await mem.createFocusPlanGiftAtomically({ ...baseGift, idempotencyKey: null, stepUpChallengeId: 'challenge-b' })).failureReason, 'gift_already_active', 'null-key normal path denies duplicate active gift');
  const snap = await mem.getControlSnapshot('target', '2026-01-01T00:00:01.000Z'); assert.equal(snap.activeGiftCount, 1, 'snapshot sees active memory gift');
  const retract = await mem.retractFocusPlanGiftAtomically(baseRetract(gift.giftRecord!.giftRecordId)); assert.equal(retract.status, 'success', 'memory retraction succeeds');
  assert.equal((await mem.getControlSnapshot('target', '2026-01-02T00:00:01.000Z')).activeGiftCount, 0, 'retracted gift removed from entitlement snapshot');
  const restrict = await mem.createUserRestrictionAtomically(baseRestriction); assert.equal(restrict.status, 'success', 'memory restriction succeeds');
  const conflict = await mem.createUserRestrictionAtomically({ ...baseRestriction, restrictionKind: 'suspended' }); assert.equal(conflict.failureReason, 'idempotency_conflict'); assert.ok('restrictionRecord' in conflict); assert.equal('giftRecord' in conflict, false, 'restriction idempotency conflict has restriction-shaped result');
  assert.ok(mem.getAuditEventsForTests().some((event) => event.eventKind === 'idempotency_conflict'), 'memory audit records idempotency conflict event'); assert.ok(mem.getTargetStateForTests('target'), 'memory target state updated');
  const rollbackGift = new MemorySuperAdminCommercialRepository(); rollbackGift.injectFailureAfterResourceMutationForTests(); await assert.rejects(() => rollbackGift.createFocusPlanGiftAtomically({ ...baseGift, idempotencyKey: null }), CommercialPersistenceError); assert.equal((await rollbackGift.getControlSnapshot('target')).activeGiftCount, 0, 'gift rollback restores resource, operation, audit and target state');
  const rollbackRetract = new MemorySuperAdminCommercialRepository(); const g2 = await rollbackRetract.createFocusPlanGiftAtomically({ ...baseGift, idempotencyKey: null }); rollbackRetract.injectFailureAfterResourceMutationForTests(); await assert.rejects(() => rollbackRetract.retractFocusPlanGiftAtomically({ ...baseRetract(g2.giftRecord!.giftRecordId), idempotencyKey: null }), CommercialPersistenceError); assert.equal((await rollbackRetract.getControlSnapshot('target', '2026-01-02T00:00:01.000Z')).activeGiftCount, 1, 'retraction rollback restores active gift');
  const rollbackRestriction = new MemorySuperAdminCommercialRepository(); rollbackRestriction.injectFailureAfterResourceMutationForTests(); await assert.rejects(() => rollbackRestriction.createUserRestrictionAtomically({ ...baseRestriction, idempotencyKey: null }), CommercialPersistenceError); assert.equal((await rollbackRestriction.getControlSnapshot('target-r')).activeRestrictionCount, 0, 'restriction rollback restores restriction, operation, audit and target state');

  const calls: Array<{ sql: string; client: boolean; params: unknown[] | undefined }> = []; let fail = false;
  __setDbPoolFactoryForTests(() => ({
    query: async (sql: string, params?: unknown[]) => { calls.push({ sql, client: false, params }); if (fail) throw new Error('missing column'); return { rows: [] }; },
    connect: async () => ({ query: async (sql: string, params?: unknown[]) => { calls.push({ sql, client: true, params }); if (fail) throw new Error('sql fail'); if (sql.includes('SELECT * FROM super_admin_commercial_operations')) return { rows: [{ operation_id: 'op-existing', request_hash: buildGiftRequestHash(baseGift), operation_status: 'pending' }] }; if (sql.includes('SELECT * FROM super_admin_focus_plan_gifts WHERE target_user_id')) return { rows: [] }; return { rows: [] }; }, release: () => calls.push({ sql: 'RELEASE', client: true, params: undefined }) }),
    end: async () => undefined
  }));
  const sqlRepo = new SQLSuperAdminCommercialRepository(); const sqlGift = await sqlRepo.createFocusPlanGiftAtomically(baseGift); assert.equal(sqlGift.status, 'success', 'SQL gift create returns durable success');
  const order = calls.filter((c) => c.client).map((c) => c.sql); assert.equal(order[0], 'BEGIN'); expectStarts('INSERT INTO super_admin_commercial_operations', order[1] ?? ''); expectStarts('SELECT * FROM super_admin_commercial_operations', order[2] ?? ''); expectStarts('INSERT INTO super_admin_commercial_target_state', order[3] ?? ''); expectStarts('SELECT target_user_id FROM super_admin_commercial_target_state', order[4] ?? ''); expectStarts('UPDATE super_admin_focus_plan_gifts SET status', order[5] ?? ''); assert.equal(calls.some((c) => !c.client), false, 'mutation queries use transaction client');
  calls.length = 0; await sqlRepo.getPersistenceReadiness(); assert.ok(calls.some((c) => c.sql.includes('super_admin_commercial_operation_events')), 'commercial readiness probes event table'); assert.ok(calls.some((c) => c.sql.includes('retraction_step_up_challenge_id')), 'commercial readiness probes 0039 columns');
  fail = true; assert.equal((await sqlRepo.getPersistenceReadiness()).persistenceStatus, 'unavailable', 'partial migration failure returns unavailable readiness'); await assert.rejects(() => sqlRepo.getControlSnapshot('target'), CommercialPersistenceError, 'SQL snapshot failure propagates typed error');
  await closeDbPool(); __setDbPoolFactoryForTests(null);
}

function expectStarts(prefix: string, value: string) { assert.ok(value.startsWith(prefix), `expected ${value} to start with ${prefix}`); return value; }
