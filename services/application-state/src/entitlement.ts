import { getPlanContract, type PlanTier } from '@elceo/config';
import type { BillingSubscriptionState, EntitlementState } from '@elceo/types';

const premiumEligibleStatuses = new Set(['trialing', 'active']);

export function resolvePlanTierFromSubscription(subscription: BillingSubscriptionState): PlanTier {
  if (subscription.planTier === 'premium' && premiumEligibleStatuses.has(subscription.status)) {
    return 'premium';
  }
  return 'free';
}

export function buildEntitlementState(planTier: PlanTier, subscription?: BillingSubscriptionState): EntitlementState {
  const contract = getPlanContract(planTier);
  const subscriptionEligibleForPremium = subscription ? premiumEligibleStatuses.has(subscription.status) : planTier === 'premium';

  return {
    planTier,
    trackedAssetLimit: contract.trackedAssetLimit,
    canAccessPremiumDepth: contract.canAccessPremiumDepth,
    canAccessBehaviorCoaching: contract.canAccessBehaviorCoaching,
    journalEntryHistoryLimit: contract.journalEntryHistoryLimit,
    dashboardModuleLimit: contract.dashboardModuleLimit,
    subscriptionEligibleForPremium
  };
}

export function enforceTrackedAssetLimit(planTier: PlanTier, assets: string[]): string[] {
  const contract = getPlanContract(planTier);
  const deduped = Array.from(new Set(assets));
  return deduped.slice(0, contract.trackedAssetLimit);
}

export function assertPlanMutationAllowed(current: BillingSubscriptionState, requested: PlanTier): void {
  if (requested === 'premium' && !premiumEligibleStatuses.has(current.status)) {
    throw new Error('Premium plan requires an active or trialing subscription state');
  }
}
