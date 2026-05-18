import assert from 'node:assert/strict';
import { assertSuperAdminStepUpFresh, buildSuperAdminCommercialAuditEvent, buildSuperAdminStepUpAuditEvent, createSuperAdminStepUpChallenge, evaluateSuperAdminGrantedEntitlement, giftFocusPlanToUser, getSuperAdminCommercialControlCoverageReport, getSuperAdminStepUpCoverageReport, getSuperAdminStepUpReadinessReport, retractFocusPlanGift, restrictUserAccount, verifySuperAdminStepUpChallenge } from '../super-admin-commercial-controls/index';

export async function runSuperAdminCommercialControlsCoreTests(): Promise<void> {
  process.env.NODE_ENV='test';
  const ch=createSuperAdminStepUpChallenge({actorUserId:'admin-1',actionKind:'focus_plan_gift',routeScope:'/api/admin/commercial/users/[userId]/gift-focus-plan',targetUserId:'user-1',providerKind:'fixture_test_only',requestedAt:'2026-05-15T00:00:00.000Z'});
  assert.equal(ch.challengeId.startsWith('stepup_'),true);
  const verify=verifySuperAdminStepUpChallenge({challengeId:ch.challengeId,providerKind:'fixture_test_only',actorUserId:'admin-1',proof:'fixture-pass',requestedAt:'2026-05-15T00:01:00.000Z'});
  assert.equal(verify.verified,true);
  assert.equal(verify.status,'verified');
  assertSuperAdminStepUpFresh({challengeId:ch.challengeId,nowIso:'2026-05-15T00:05:00.000Z'});
  assert.throws(()=>assertSuperAdminStepUpFresh({challengeId:ch.challengeId,nowIso:'2026-05-15T01:00:00.000Z'}));
  const replay=verifySuperAdminStepUpChallenge({challengeId:ch.challengeId,providerKind:'fixture_test_only',actorUserId:'admin-1',proof:'fixture-pass',requestedAt:'2026-05-15T00:02:00.000Z'});
  assert.equal(replay.status,'replayed');

  const stepUp={status:'verified' as const,method:'fixture_only' as const,verifiedAt:'2026-05-15T00:01:00.000Z',challengeId:ch.challengeId,providerStatus:'fixture_only' as const};
  const gift=await giftFocusPlanToUser({actorSuperAdminId:'admin-1',targetUserId:'user-1',duration:'two_weeks',reasonCode:'commercial_support',operatorNote:'grant',stepUpVerification:stepUp,idempotencyKey:'id-1',requestedAt:'2026-05-15T00:02:00.000Z'});
  assert.equal(gift.status,'success');
  const blocked=await giftFocusPlanToUser({actorSuperAdminId:'admin-1',targetUserId:'user-1',duration:'two_weeks',reasonCode:'commercial_support',operatorNote:'x',stepUpVerification:{...stepUp,status:'missing'},idempotencyKey:null,requestedAt:'2026-05-15T00:00:00.000Z'} as never);
  assert.equal(blocked.status,'blocked');
  const retracted=await retractFocusPlanGift({actorSuperAdminId:'admin-1',targetUserId:'user-1',giftRecordId:gift.giftRecord!.giftRecordId,reasonCode:'operator_correction',operatorNote:'reverse',stepUpVerification:stepUp,idempotencyKey:'id-3',requestedAt:'2026-05-15T00:03:00.000Z'});
  assert.equal(retracted.status,'success');
  const restriction=await restrictUserAccount({actorSuperAdminId:'admin-1',targetUserId:'user-3',restrictionKind:'banned',reasonCode:'policy_violation',operatorNote:'abuse',stepUpVerification:stepUp,idempotencyKey:'id-4',requestedAt:'2026-05-15T00:04:00.000Z'});
  assert.equal(restriction.status,'success');
  assert.equal(evaluateSuperAdminGrantedEntitlement({subscriptionActive:true,gift:null,nowIso:'2026-07-20T00:00:00.000Z',restricted:false}),'focus_plan_active');
  assert.equal(buildSuperAdminCommercialAuditEvent({actorSuperAdminId:'admin-1',targetUserId:'user-3',actionKind:'user_restriction',reasonCode:'policy_violation',operatorNote:'abuse',stepUpStatus:'verified',createdAt:'2026-05-15T00:00:00.000Z',resultingEntitlementState:'restricted',idempotencyKey:'id-4'}).actionKind,'user_restriction');
  assert.equal(buildSuperAdminStepUpAuditEvent({actorUserId:'admin-1',action:'focus_plan_gift',targetUserId:'user-1',challengeId:ch.challengeId,providerKind:'fixture_test_only',verificationStatus:'verified',failureReason:null,routeScope:'/api/admin/commercial/users/[userId]/gift-focus-plan'}).redactionStatus,'safe');

  assert.equal(getSuperAdminCommercialControlCoverageReport().ipBanSupported,false);
  assert.equal(getSuperAdminStepUpReadinessReport().find((x)=>x.providerKind==='totp')?.readiness,'provider_pending');
  assert.equal(getSuperAdminStepUpCoverageReport().persistenceStatus,'memory_fallback');
  const pendingProviderChallenge=createSuperAdminStepUpChallenge({actorUserId:'admin-2',actionKind:'user_restriction',routeScope:'/api/admin/commercial/users/[userId]/restrict',targetUserId:'user-9',providerKind:'totp',requestedAt:'2026-05-15T00:00:00.000Z'});
  assert.equal(verifySuperAdminStepUpChallenge({challengeId:pendingProviderChallenge.challengeId,providerKind:'totp',actorUserId:'admin-2',proof:'111111',requestedAt:'2026-05-15T00:00:30.000Z'}).status,'provider_pending');
}
