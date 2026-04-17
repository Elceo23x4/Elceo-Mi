import type { PlanTier } from '@elceo/config';

export type EntitlementState = {
  planTier: PlanTier;
  trackedAssetLimit: number;
  canAccessPremiumDepth: boolean;
  canAccessBehaviorCoaching: boolean;
  journalEntryHistoryLimit: number;
  dashboardModuleLimit: number;
  subscriptionEligibleForPremium: boolean;
};
