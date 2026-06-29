import assert from 'node:assert/strict';
import { assertSuperAdminStepUpFresh, buildSuperAdminCommercialAuditEvent, buildSuperAdminStepUpAuditEvent, createSuperAdminStepUpChallenge, evaluateSuperAdminGrantedEntitlement, giftFocusPlanToUser, getSuperAdminCommercialControlCoverageReport, getSuperAdminCommercialRouteScope, getSuperAdminStepUpCoverageReport, getSuperAdminStepUpReadinessReport, retractFocusPlanGift, restrictUserAccount, verifySuperAdminStepUpChallenge } from '../super-admin-commercial-controls/index';

const at = (minute: number) => `2026-05-15T00:${String(minute).padStart(2, '0')}:00.000Z`;
const plusMinute = (iso: string) => new Date(new Date(iso).getTime() + 60_000).toISOString();
const makeVerifiedChallenge = (suffix: string, actionKind: 'focus_plan_gift' | 'focus_plan_gift_retract' | 'user_restriction', targetUserId = `user-${suffix}`, actorUserId = `admin-${suffix}`, requestedAt = at(0)) => {
  const ch = createSuperAdminStepUpChallenge({ actorUserId, actionKind, routeScope: getSuperAdminCommercialRouteScope(actionKind), targetUserId, providerKind: 'fixture_test_only', requestedAt });
  const verified = verifySuperAdminStepUpChallenge({ challengeId: ch.challengeId, providerKind: 'fixture_test_only', actorUserId, proof: `fixture-pass`, requestedAt: plusMinute(requestedAt) });
  assert.equal(verified.status, 'verified');
  return ch;
};

export async function runSuperAdminCommercialControlsCoreTests(): Promise<void> {
  const oldNodeEnv = process.env.NODE_ENV;
  const oldFixture = process.env.ELCEO_ENABLE_FIXTURE_STEP_UP;
  process.env.NODE_ENV = 'test';
  process.env.ELCEO_ENABLE_FIXTURE_STEP_UP = '1';

  const ch = makeVerifiedChallenge('1', 'focus_plan_gift', 'user-1', 'admin-1');
  assert.equal(ch.challengeId.startsWith('stepup_'), true);
  assertSuperAdminStepUpFresh({ challengeId: ch.challengeId, nowIso: at(5) });
  assert.throws(() => assertSuperAdminStepUpFresh({ challengeId: ch.challengeId, nowIso: '2026-05-15T01:00:00.000Z' }));
  assert.equal(verifySuperAdminStepUpChallenge({ challengeId: ch.challengeId, providerKind: 'fixture_test_only', actorUserId: 'admin-1', proof: 'fixture-pass', requestedAt: at(2) }).status, 'replayed');

  const forged = await giftFocusPlanToUser({ actorSuperAdminId: 'admin-forged', targetUserId: 'user-forged', duration: 'two_weeks', reasonCode: 'commercial_support', operatorNote: 'forged', stepUpVerification: { status: 'verified', challengeId: null, verifiedAt: null }, idempotencyKey: null, requestedAt: at(2) } as never);
  assert.equal(forged.status, 'blocked');
  for (const stepUpChallengeId of [undefined, '', 12]) {
    const missing = await giftFocusPlanToUser({ actorSuperAdminId: 'admin-missing', targetUserId: 'user-missing', duration: 'two_weeks', reasonCode: 'commercial_support', operatorNote: 'missing', stepUpChallengeId, idempotencyKey: null, requestedAt: at(2) } as never);
    assert.equal(missing.status, 'blocked');
  }

  const gift = await giftFocusPlanToUser({ actorSuperAdminId: 'admin-1', targetUserId: 'user-1', duration: 'two_weeks', reasonCode: 'commercial_support', operatorNote: 'grant', stepUpChallengeId: ch.challengeId, idempotencyKey: 'id-1', requestedAt: at(2) });
  assert.equal(gift.status, 'success');
  assert.equal(gift.giftRecord?.stepUpStatus, 'verified');
  const replayGift = await giftFocusPlanToUser({ actorSuperAdminId: 'admin-1', targetUserId: 'user-1', duration: 'two_weeks', reasonCode: 'commercial_support', operatorNote: 'reuse', stepUpChallengeId: ch.challengeId, idempotencyKey: null, requestedAt: at(3) });
  assert.equal(replayGift.status, 'blocked');
  const reuseOtherRoute = await restrictUserAccount({ actorSuperAdminId: 'admin-1', targetUserId: 'user-1', restrictionKind: 'banned', reasonCode: 'policy_violation', operatorNote: 'reuse', stepUpChallengeId: ch.challengeId, idempotencyKey: null, requestedAt: at(3) });
  assert.equal(reuseOtherRoute.status, 'blocked');

  const retractChallenge = makeVerifiedChallenge('retract', 'focus_plan_gift_retract', 'user-1', 'admin-1', at(4));
  const retracted = await retractFocusPlanGift({ actorSuperAdminId: 'admin-1', targetUserId: 'user-1', giftRecordId: gift.giftRecord!.giftRecordId, reasonCode: 'operator_correction', operatorNote: 'reverse', stepUpChallengeId: retractChallenge.challengeId, idempotencyKey: 'id-3', requestedAt: at(5) });
  assert.equal(retracted.status, 'success');
  const restrictionChallenge = makeVerifiedChallenge('restriction', 'user_restriction', 'user-3', 'admin-3', at(6));
  const restriction = await restrictUserAccount({ actorSuperAdminId: 'admin-3', targetUserId: 'user-3', restrictionKind: 'banned', reasonCode: 'policy_violation', operatorNote: 'abuse', stepUpChallengeId: restrictionChallenge.challengeId, idempotencyKey: 'id-4', requestedAt: at(7) });
  assert.equal(restriction.status, 'success');

  const giftOnly = makeVerifiedChallenge('cross', 'focus_plan_gift', 'user-cross', 'admin-cross', at(8));
  assert.equal((await retractFocusPlanGift({ actorSuperAdminId: 'admin-cross', targetUserId: 'user-cross', giftRecordId: gift.giftRecord!.giftRecordId, reasonCode: 'operator_correction', operatorNote: 'cross', stepUpChallengeId: giftOnly.challengeId, idempotencyKey: null, requestedAt: at(9) })).status, 'blocked');
  assert.equal((await restrictUserAccount({ actorSuperAdminId: 'admin-cross', targetUserId: 'user-cross', restrictionKind: 'suspended', reasonCode: 'policy_violation', operatorNote: 'cross', stepUpChallengeId: giftOnly.challengeId, idempotencyKey: null, requestedAt: at(9) })).status, 'blocked');
  const restrictionOnly = makeVerifiedChallenge('cross2', 'user_restriction', 'user-cross2', 'admin-cross2', at(10));
  assert.equal((await giftFocusPlanToUser({ actorSuperAdminId: 'admin-cross2', targetUserId: 'user-cross2', duration: 'two_weeks', reasonCode: 'commercial_support', operatorNote: 'cross', stepUpChallengeId: restrictionOnly.challengeId, idempotencyKey: null, requestedAt: at(11) })).status, 'blocked');

  const wrongTarget = makeVerifiedChallenge('target', 'focus_plan_gift', 'user-target-1', 'admin-target', at(12));
  assert.equal((await giftFocusPlanToUser({ actorSuperAdminId: 'admin-target', targetUserId: 'user-target-2', duration: 'two_weeks', reasonCode: 'commercial_support', operatorNote: 'wrong target', stepUpChallengeId: wrongTarget.challengeId, idempotencyKey: null, requestedAt: at(13) })).status, 'blocked');
  assert.equal((await giftFocusPlanToUser({ actorSuperAdminId: 'admin-other', targetUserId: 'user-target-1', duration: 'two_weeks', reasonCode: 'commercial_support', operatorNote: 'wrong actor', stepUpChallengeId: wrongTarget.challengeId, idempotencyKey: null, requestedAt: at(13) })).status, 'blocked');

  const wrongRoute = createSuperAdminStepUpChallenge({ actorUserId: 'admin-route', actionKind: 'focus_plan_gift', routeScope: '/wrong', targetUserId: 'user-route', providerKind: 'fixture_test_only', requestedAt: at(14) });
  assert.equal(verifySuperAdminStepUpChallenge({ challengeId: wrongRoute.challengeId, providerKind: 'fixture_test_only', actorUserId: 'admin-route', proof: 'fixture-pass', requestedAt: at(15) }).status, 'verified');
  assert.equal((await giftFocusPlanToUser({ actorSuperAdminId: 'admin-route', targetUserId: 'user-route', duration: 'two_weeks', reasonCode: 'commercial_support', operatorNote: 'wrong route', stepUpChallengeId: wrongRoute.challengeId, idempotencyKey: null, requestedAt: '2026-05-15T00:15:30.000Z' })).status, 'blocked');

  const stale = makeVerifiedChallenge('stale', 'focus_plan_gift', 'user-stale', 'admin-stale', at(16));
  assert.equal((await giftFocusPlanToUser({ actorSuperAdminId: 'admin-stale', targetUserId: 'user-stale', duration: 'two_weeks', reasonCode: 'commercial_support', operatorNote: 'stale', stepUpChallengeId: stale.challengeId, idempotencyKey: null, requestedAt: '2026-05-15T01:00:00.000Z' })).status, 'blocked');

  for (const providerKind of ['fixture_test_only'] as const) {
    const pending = createSuperAdminStepUpChallenge({ actorUserId: `admin-pending-${providerKind}`, actionKind: 'focus_plan_gift', routeScope: getSuperAdminCommercialRouteScope('focus_plan_gift'), targetUserId: `user-pending-${providerKind}`, providerKind, requestedAt: at(17) });
    assert.equal((await giftFocusPlanToUser({ actorSuperAdminId: pending.actorUserId, targetUserId: pending.targetUserId!, duration: 'two_weeks', reasonCode: 'commercial_support', operatorNote: 'pending', stepUpChallengeId: pending.challengeId, idempotencyKey: null, requestedAt: at(18) })).status, 'blocked');
  }

  const providerMismatch = createSuperAdminStepUpChallenge({ actorUserId: 'admin-provider', actionKind: 'focus_plan_gift', routeScope: getSuperAdminCommercialRouteScope('focus_plan_gift'), targetUserId: 'user-provider', providerKind: 'totp', requestedAt: at(19) });
  const mismatchResult = verifySuperAdminStepUpChallenge({ challengeId: providerMismatch.challengeId, providerKind: 'fixture_test_only', actorUserId: 'admin-provider', proof: 'fixture-pass', requestedAt: '2026-05-15T00:19:30.000Z' });
  assert.equal(mismatchResult.verified, false);
  assert.notEqual(mismatchResult.status, 'verified');

  process.env.NODE_ENV = 'production';
  process.env.ELCEO_ENABLE_FIXTURE_STEP_UP = '1';
  const prodFixture = createSuperAdminStepUpChallenge({ actorUserId: 'admin-prod', actionKind: 'focus_plan_gift', routeScope: getSuperAdminCommercialRouteScope('focus_plan_gift'), targetUserId: 'user-prod', providerKind: 'fixture_test_only', requestedAt: at(20) });
  assert.equal(verifySuperAdminStepUpChallenge({ challengeId: prodFixture.challengeId, providerKind: 'fixture_test_only', actorUserId: 'admin-prod', proof: 'fixture-pass', requestedAt: '2026-05-15T00:20:30.000Z' }).verified, false);
  process.env.NODE_ENV = 'test';
  process.env.ELCEO_ENABLE_FIXTURE_STEP_UP = '1';

  const concurrent = makeVerifiedChallenge('concurrent', 'focus_plan_gift', 'user-concurrent', 'admin-concurrent', at(21));
  const [a, b] = await Promise.all([
    giftFocusPlanToUser({ actorSuperAdminId: 'admin-concurrent', targetUserId: 'user-concurrent', duration: 'two_weeks', reasonCode: 'commercial_support', operatorNote: 'a', stepUpChallengeId: concurrent.challengeId, idempotencyKey: null, requestedAt: at(22) }),
    giftFocusPlanToUser({ actorSuperAdminId: 'admin-concurrent', targetUserId: 'user-concurrent', duration: 'two_weeks', reasonCode: 'commercial_support', operatorNote: 'b', stepUpChallengeId: concurrent.challengeId, idempotencyKey: null, requestedAt: at(22) })
  ]);
  assert.equal([a.status, b.status].filter((x) => x === 'success').length, 1);
  assert.equal([a.status, b.status].filter((x) => x === 'blocked').length, 1);

  assert.equal(evaluateSuperAdminGrantedEntitlement({ subscriptionActive: true, gift: null, nowIso: '2026-07-20T00:00:00.000Z', restricted: false }), 'focus_plan_active');
  assert.equal(buildSuperAdminCommercialAuditEvent({ actorSuperAdminId: 'admin-1', targetUserId: 'user-3', actionKind: 'user_restriction', reasonCode: 'policy_violation', operatorNote: 'abuse', stepUpStatus: 'verified', createdAt: '2026-05-15T00:00:00.000Z', resultingEntitlementState: 'restricted', idempotencyKey: 'id-4' }).actionKind, 'user_restriction');
  assert.equal(buildSuperAdminStepUpAuditEvent({ actorUserId: 'admin-1', action: 'focus_plan_gift', targetUserId: 'user-1', challengeId: ch.challengeId, providerKind: 'fixture_test_only', verificationStatus: 'verified', failureReason: null, routeScope: getSuperAdminCommercialRouteScope('focus_plan_gift') }).redactionStatus, 'safe');
  assert.equal(getSuperAdminCommercialControlCoverageReport().ipBanSupported, false);
  assert.equal(getSuperAdminStepUpReadinessReport().find((x) => x.providerKind === 'totp')?.readiness, 'provider_pending');
  assert.equal(getSuperAdminStepUpCoverageReport().persistenceStatus, 'memory_fallback');
  const pendingProviderChallenge = createSuperAdminStepUpChallenge({ actorUserId: 'admin-2', actionKind: 'user_restriction', routeScope: getSuperAdminCommercialRouteScope('user_restriction'), targetUserId: 'user-9', providerKind: 'totp', requestedAt: '2026-05-15T00:00:00.000Z' });
  assert.equal(verifySuperAdminStepUpChallenge({ challengeId: pendingProviderChallenge.challengeId, providerKind: 'totp', actorUserId: 'admin-2', proof: '111111', requestedAt: '2026-05-15T00:00:30.000Z' }).status, 'provider_pending');

  process.env.NODE_ENV = oldNodeEnv;
  if (oldFixture === undefined) delete process.env.ELCEO_ENABLE_FIXTURE_STEP_UP; else process.env.ELCEO_ENABLE_FIXTURE_STEP_UP = oldFixture;
}
