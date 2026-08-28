import type { CommercialEntitlementCoverageReport, CommercialFeatureAccessRequest, CommercialFeatureAccessResult, CommercialFeatureKey, CommercialPaymentReadinessCheck, CommercialPlanCatalog, CommercialPlanCode, CommercialProfileSocialIdentifier, CommercialSubscriptionWallResult, FocusPlanDescriptor, KickOffTrialDescriptor, UserCommercialEntitlementSnapshot } from '@elceo/types';
import { validateCommercialProfileSocialIdentifier as validateCommercialProfileSocialIdentifierSchema } from '@elceo/schemas';

const kickOffFeatures: Array<Extract<CommercialFeatureKey,'dashboard.chart'|'dashboard.evidence_score'|'dashboard.macro_headlines'|'journal.page'>>=['dashboard.chart','dashboard.evidence_score','dashboard.macro_headlines','journal.page'];

export const getKickOffTrialDescriptor=():KickOffTrialDescriptor=>({planCode:'kick_off',displayName:'Kick off',billingIntervals:['monthly','quarterly','yearly'],trialDurationDays:3,featureAllowlist:[...kickOffFeatures]});
export const getFocusPlanDescriptor=():FocusPlanDescriptor=>({planCode:'focus_plan',displayName:'Focus Plan',billingIntervals:['monthly','quarterly','yearly'],monthlyPrice:{amount:70,currency:'USD'},quarterlyPrice:{status:'pending_price_config'},yearlyPrice:{status:'pending_price_config'}});
export const getCommercialPlanCatalog=():CommercialPlanCatalog=>({plans:[getKickOffTrialDescriptor(),getFocusPlanDescriptor()]});
export const getCommercialFeatureAllowlistForPlan=(planCode:CommercialPlanCode):CommercialFeatureKey[]=>planCode==='kick_off'?[...kickOffFeatures]:['premium.full_access'];

const expired=(trialStartedAt:string,nowIso:string)=>new Date(nowIso).getTime()>=new Date(trialStartedAt).getTime()+3*24*60*60*1000;

export const buildSubscriptionWallResult=(snapshot:UserCommercialEntitlementSnapshot):CommercialSubscriptionWallResult=>({required:true,reason:snapshot.activePlanCode==='focus_plan'?'focus_plan_inactive':'subscription_required',targetPlanCode:'focus_plan'});

export const evaluateUserCommercialEntitlement=(snapshot:UserCommercialEntitlementSnapshot):CommercialFeatureAccessResult['status']=>{
  if(snapshot.userRestrictionStatus==='suspended'||snapshot.userRestrictionStatus==='banned') return 'subscription_required';
  if(snapshot.activePlanCode==='focus_plan'&&snapshot.subscriptionActive) return 'active';
  if(snapshot.superAdminGift?.status==='active'&&new Date(snapshot.nowIso).getTime()<new Date(snapshot.superAdminGift.endsAt).getTime()) return 'active';
  if(snapshot.activePlanCode==='kick_off' && snapshot.trialStartedAt && !expired(snapshot.trialStartedAt,snapshot.nowIso)) return 'trial_active';
  return 'subscription_required';
};

export const evaluateCommercialFeatureAccess=(request:CommercialFeatureAccessRequest):CommercialFeatureAccessResult=>{
  const status=evaluateUserCommercialEntitlement(request.snapshot);
  if(status==='active') return {decision:'allow',status,reason:'feature_allowed',subscriptionWall:null};
  if(status==='trial_active'){
    if(kickOffFeatures.includes(request.featureKey as never)) return {decision:'allow',status,reason:'feature_allowed',subscriptionWall:null};
    return {decision:'deny',status,reason:'feature_not_in_trial_allowlist',subscriptionWall:buildSubscriptionWallResult(request.snapshot)};
  }
  return {decision:'deny',status:'subscription_required',reason:'subscription_required',subscriptionWall:buildSubscriptionWallResult(request.snapshot)};
};

export const validateCommercialProfileSocialIdentifier=(identifier:CommercialProfileSocialIdentifier):CommercialProfileSocialIdentifier=>{
  const checked=validateCommercialProfileSocialIdentifierSchema(identifier);
  if(!checked.ok) throw new Error('commercial_social_identifier_invalid');
  return checked.value;
};

export const checkCommercialPaymentReadiness=(input:{identifiers:CommercialProfileSocialIdentifier[]}):CommercialPaymentReadinessCheck=>{
  const normalized: CommercialProfileSocialIdentifier[] = [];
  for (const id of input.identifiers) { const checked = validateCommercialProfileSocialIdentifierSchema(id); if (checked.ok) normalized.push(checked.value); }
  if(normalized.length<1) return {status:'blocked',reason:'missing_social_identifier',normalizedIdentifiers:[]};
  return {status:'eligible',reason:'ready',normalizedIdentifiers:normalized};
};

export const getCommercialEntitlementCoverageReport=():CommercialEntitlementCoverageReport=>({generatedAt:new Date().toISOString(),kickOffAllowlist:[...kickOffFeatures],focusPlanPremiumEnabled:true,providerCallsPerformed:false});
export const guardCommercialFeatureAccess=evaluateCommercialFeatureAccess;

export * from './user-social-identifiers';
export * from './resolver';
