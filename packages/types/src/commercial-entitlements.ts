export type CommercialPlanCode = 'kick_off' | 'focus_plan';
export type CommercialBillingInterval = 'monthly' | 'quarterly' | 'yearly';
export type CommercialEntitlementStatus = 'active' | 'trial_active' | 'inactive' | 'subscription_required';
export type CommercialAccessDecision = 'allow' | 'deny';
export type CommercialTrialStatus = 'active' | 'expired' | 'not_started';
export type CommercialSubscriptionWallReason = 'subscription_required' | 'feature_not_in_trial_allowlist' | 'focus_plan_inactive';
export type CommercialProfileSocialIdentifierKind = 'linkedin_address' | 'telegram_id' | 'x_username';
export type CommercialPaymentReadinessStatus = 'eligible' | 'blocked';
export type CommercialFeatureKey = 'dashboard.chart' | 'dashboard.evidence_score' | 'dashboard.macro_headlines' | 'journal.page' | 'premium.full_access';

export type CommercialPlanDescriptor = {
  planCode: CommercialPlanCode;
  displayName: 'Kick off' | 'Focus Plan';
  billingIntervals: CommercialBillingInterval[];
};
export type KickOffTrialDescriptor = CommercialPlanDescriptor & { planCode: 'kick_off'; trialDurationDays: 3; featureAllowlist: Extract<CommercialFeatureKey, 'dashboard.chart' | 'dashboard.evidence_score' | 'dashboard.macro_headlines' | 'journal.page'>[] };
export type FocusPlanDescriptor = CommercialPlanDescriptor & { planCode: 'focus_plan'; monthlyPrice: { amount: 70; currency: 'USD' }; quarterlyPrice: { status: 'pending_price_config' }; yearlyPrice: { status: 'pending_price_config' } };
export type CommercialPlanCatalog = { plans: [KickOffTrialDescriptor, FocusPlanDescriptor] };

export type CommercialProfileSocialIdentifier = { kind: CommercialProfileSocialIdentifierKind; value: string };
export type UserCommercialEntitlementSnapshot = { userId: string; nowIso: string; trialStartedAt: string | null; activePlanCode: CommercialPlanCode | null; subscriptionActive: boolean; socialIdentifiers: CommercialProfileSocialIdentifier[]; superAdminGift?: { status: 'active' | 'retracted' | 'expired'; endsAt: string } | null; userRestrictionStatus?: 'none' | 'suspended' | 'banned' };
export type CommercialFeatureAccessRequest = { snapshot: UserCommercialEntitlementSnapshot; featureKey: CommercialFeatureKey };
export type CommercialSubscriptionWallResult = { required: boolean; reason: CommercialSubscriptionWallReason; targetPlanCode: 'focus_plan' };
export type CommercialFeatureAccessResult = { decision: CommercialAccessDecision; status: CommercialEntitlementStatus; reason: 'feature_allowed' | CommercialSubscriptionWallReason; subscriptionWall: CommercialSubscriptionWallResult | null };
export type CommercialPaymentReadinessCheck = { status: CommercialPaymentReadinessStatus; reason: 'ready' | 'missing_social_identifier'; normalizedIdentifiers: CommercialProfileSocialIdentifier[] };
export type CommercialEntitlementCoverageReport = { generatedAt: string; kickOffAllowlist: CommercialFeatureKey[]; focusPlanPremiumEnabled: boolean; providerCallsPerformed: false };
