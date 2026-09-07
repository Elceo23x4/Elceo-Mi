import assert from 'node:assert/strict';
import { checkCommercialPaymentReadiness, evaluateCommercialFeatureAccess, getCommercialPlanCatalog, getFocusPlanDescriptor, getKickOffTrialDescriptor } from '../commercial-entitlements/index';

import { clearUserSocialIdentifiersMemoryStore, getUserSocialIdentifiersSnapshot, upsertUserSocialIdentifiersSnapshot } from '../commercial-entitlements/user-social-identifiers';

export async function runCommercialEntitlementsCoreTests(): Promise<void> {
  const catalog=getCommercialPlanCatalog();
  assert.equal(catalog.plans[0].planCode,'kick_off'); assert.equal(catalog.plans[1].planCode,'focus_plan');
  assert.equal(getKickOffTrialDescriptor().trialDurationDays,3);
  const focus=getFocusPlanDescriptor(); assert.equal(focus.pricingAuthority,'commercial_price_versions'); assert.equal(focus.priceConfiguredAtCheckout,true);

  const activeTrial={userId:'u1',nowIso:'2026-05-15T00:00:00.000Z',trialStartedAt:'2026-05-14T00:00:00.000Z',activePlanCode:'kick_off' as const,subscriptionActive:false,socialIdentifiers:[]};
  for (const f of ['dashboard.chart','dashboard.evidence_score','dashboard.macro_headlines','journal.page'] as const){ assert.equal(evaluateCommercialFeatureAccess({snapshot:activeTrial,featureKey:f}).decision,'allow'); }
  assert.equal(evaluateCommercialFeatureAccess({snapshot:activeTrial,featureKey:'premium.full_access'}).reason,'feature_not_in_trial_allowlist');
  assert.equal(evaluateCommercialFeatureAccess({ snapshot: activeTrial, featureKey: 'premium.full_access' }).reason, 'feature_not_in_trial_allowlist');

  const expired={...activeTrial,trialStartedAt:'2026-05-10T00:00:00.000Z'};
  const expiredDecision = evaluateCommercialFeatureAccess({snapshot:expired,featureKey:'dashboard.chart'});
  assert.equal(expiredDecision.status,'subscription_required');
  assert.equal(expiredDecision.subscriptionWall?.required, true);

  const focusActive={...activeTrial,activePlanCode:'focus_plan' as const,subscriptionActive:true,trialStartedAt:null};
  assert.equal(evaluateCommercialFeatureAccess({snapshot:focusActive,featureKey:'premium.full_access'}).decision,'allow');
  const focusInactive={...focusActive,subscriptionActive:false};
  assert.equal(evaluateCommercialFeatureAccess({snapshot:focusInactive,featureKey:'premium.full_access'}).decision,'deny');

  const gifted={...focusInactive,activePlanCode:null,superAdminGift:{status:'active' as const,endsAt:'2026-05-20T00:00:00.000Z'}};
  assert.equal(evaluateCommercialFeatureAccess({snapshot:gifted,featureKey:'premium.full_access'}).decision,'allow');
  const giftExpired={...gifted,superAdminGift:{status:'expired' as const,endsAt:'2026-05-10T00:00:00.000Z'}};
  assert.equal(evaluateCommercialFeatureAccess({snapshot:giftExpired,featureKey:'premium.full_access'}).decision,'deny');

  const restricted={...focusActive,userRestrictionStatus:'banned' as const};
  assert.equal(evaluateCommercialFeatureAccess({snapshot:restricted,featureKey:'premium.full_access'}).decision,'deny');
  assert.equal(checkCommercialPaymentReadiness({identifiers:[]}).status,'blocked');
  assert.equal(checkCommercialPaymentReadiness({identifiers:[{kind:'linkedin_address',value:'linkedin.com/in/user'}]}).status,'eligible');
  assert.equal(checkCommercialPaymentReadiness({identifiers:[{kind:'telegram_id',value:'@user'}]}).status,'eligible');
  assert.equal(checkCommercialPaymentReadiness({identifiers:[{kind:'x_username',value:'@userx'}]}).status,'eligible');
  assert.equal(checkCommercialPaymentReadiness({identifiers:[{kind:'x_username',value:'<script>'}]}).status,'blocked');


  clearUserSocialIdentifiersMemoryStore();
  const u='user-social-test';
  let snap = await upsertUserSocialIdentifiersSnapshot(u,[{kind:'linkedin_address',value:'https://linkedin.com/in/elceo'}]);
  assert.equal(snap.socialIdentifiers[0]?.kind,'linkedin_address');
  snap = await upsertUserSocialIdentifiersSnapshot(u,[{kind:'telegram_id',value:'elceo_telegram'}]);
  assert.equal(snap.socialIdentifiers[0]?.kind,'telegram_id');
  snap = await upsertUserSocialIdentifiersSnapshot(u,[{kind:'x_username',value:'elceox'}]);
  assert.equal(snap.socialIdentifiers[0]?.kind,'x_username');
  assert.equal(snap.persistenceStatus,'memory_fallback');
  assert.equal(snap.paymentReadiness.status,'eligible');

  const emptySnap = await getUserSocialIdentifiersSnapshot('missing-user');
  assert.equal(emptySnap.paymentReadiness.status,'blocked');
  assert.equal(emptySnap.paymentReadiness.reason,'missing_social_identifier');
  assert.equal(emptySnap.persistenceStatus,'memory_fallback');
  assert.equal(JSON.stringify(snap).toLowerCase().includes('password'), false);
  assert.equal(JSON.stringify(snap).toLowerCase().includes('session'), false);

}


