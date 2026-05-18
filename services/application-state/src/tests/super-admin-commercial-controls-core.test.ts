import assert from 'node:assert/strict';
import { buildSuperAdminCommercialAuditEvent, evaluateSuperAdminGrantedEntitlement, giftFocusPlanToUser, getSuperAdminCommercialControlCoverageReport, retractFocusPlanGift, restrictUserAccount } from '../super-admin-commercial-controls/index';

const stepUp={status:'verified' as const,method:'fixture_only' as const,verifiedAt:'2026-05-15T00:00:00.000Z',challengeId:'c1',providerStatus:'fixture_only' as const};

export async function runSuperAdminCommercialControlsCoreTests(): Promise<void> {
  const gift=await giftFocusPlanToUser({actorSuperAdminId:'admin-1',targetUserId:'user-1',duration:'two_weeks',reasonCode:'commercial_support',operatorNote:'grant',stepUpVerification:stepUp,idempotencyKey:'id-1',requestedAt:'2026-05-15T00:00:00.000Z'});
  assert.equal(gift.status,'success');
  assert.equal(gift.giftRecord?.status,'active');
  assert.equal(gift.giftRecord?.endsAt,'2026-05-29T00:00:00.000Z');
  const giftMonth=await giftFocusPlanToUser({actorSuperAdminId:'admin-1',targetUserId:'user-2',duration:'one_month',reasonCode:'commercial_support',operatorNote:'grant',stepUpVerification:stepUp,idempotencyKey:'id-2',requestedAt:'2026-05-15T00:00:00.000Z'});
  assert.equal(giftMonth.giftRecord?.endsAt,'2026-06-14T00:00:00.000Z');
  const blocked=await giftFocusPlanToUser({actorSuperAdminId:'admin-1',targetUserId:'user-1',duration:'two_weeks',reasonCode:'commercial_support',operatorNote:'x',stepUpVerification:{...stepUp,status:'missing'},idempotencyKey:null,requestedAt:'2026-05-15T00:00:00.000Z'} as never);
  assert.equal(blocked.status,'blocked');
  const retracted=await retractFocusPlanGift({actorSuperAdminId:'admin-1',targetUserId:'user-1',giftRecordId:gift.giftRecord!.giftRecordId,reasonCode:'operator_correction',operatorNote:'reverse',stepUpVerification:stepUp,idempotencyKey:'id-3',requestedAt:'2026-05-15T00:01:00.000Z'});
  assert.equal(retracted.status,'success');
  assert.equal(retracted.giftRecord?.status,'retracted');
  const restriction=await restrictUserAccount({actorSuperAdminId:'admin-1',targetUserId:'user-3',restrictionKind:'banned',reasonCode:'policy_violation',operatorNote:'abuse',stepUpVerification:stepUp,idempotencyKey:'id-4',requestedAt:'2026-05-15T00:00:00.000Z'});
  assert.equal(restriction.status,'success');
  assert.equal(evaluateSuperAdminGrantedEntitlement({subscriptionActive:false,gift:giftMonth.giftRecord!,nowIso:'2026-05-20T00:00:00.000Z',restricted:false}),'focus_plan_active');
  assert.equal(evaluateSuperAdminGrantedEntitlement({subscriptionActive:false,gift:giftMonth.giftRecord!,nowIso:'2026-07-20T00:00:00.000Z',restricted:false}),'subscription_required');
  assert.equal(evaluateSuperAdminGrantedEntitlement({subscriptionActive:true,gift:null,nowIso:'2026-07-20T00:00:00.000Z',restricted:false}),'focus_plan_active');
  assert.equal(evaluateSuperAdminGrantedEntitlement({subscriptionActive:true,gift:giftMonth.giftRecord!,nowIso:'2026-05-20T00:00:00.000Z',restricted:true}),'restricted');
  assert.equal(buildSuperAdminCommercialAuditEvent({actorSuperAdminId:'admin-1',targetUserId:'user-3',actionKind:'user_restriction',reasonCode:'policy_violation',operatorNote:'abuse',stepUpStatus:'verified',createdAt:'2026-05-15T00:00:00.000Z',resultingEntitlementState:'restricted',idempotencyKey:'id-4'}).actionKind,'user_restriction');

  const invalidDuration=await giftFocusPlanToUser({actorSuperAdminId:'admin-1',targetUserId:'user-1',duration:'yearly' as never,reasonCode:'commercial_support',operatorNote:'x',stepUpVerification:stepUp,idempotencyKey:null,requestedAt:'2026-05-15T00:00:00.000Z'});
  assert.equal(invalidDuration.status,'blocked');
  const ipRejected=await restrictUserAccount({actorSuperAdminId:'admin-1',targetUserId:'user-9',restrictionKind:'banned',reasonCode:'policy_violation',operatorNote:'abuse',stepUpVerification:stepUp,idempotencyKey:'id-5',requestedAt:'2026-05-15T00:00:00.000Z',ipAddress:'1.1.1.1'} as never);
  assert.equal(ipRejected.status,'blocked');

  assert.equal(getSuperAdminCommercialControlCoverageReport().ipBanSupported,false);
}
