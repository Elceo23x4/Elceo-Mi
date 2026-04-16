export type PlanTier = 'free' | 'premium';

export type PlanContract = {
  tier: PlanTier;
  label: string;
  trackedAssetLimit: number;
  canAccessPremiumDepth: boolean;
  canAccessBehaviorCoaching: boolean;
  journalEntryHistoryLimit: number;
  dashboardModuleLimit: number;
};

export const planContracts: Record<PlanTier, PlanContract> = {
  free: {
    tier: 'free',
    label: 'ELCEO Free',
    trackedAssetLimit: 4,
    canAccessPremiumDepth: false,
    canAccessBehaviorCoaching: false,
    journalEntryHistoryLimit: 40,
    dashboardModuleLimit: 3
  },
  premium: {
    tier: 'premium',
    label: 'ELCEO Premium',
    trackedAssetLimit: 12,
    canAccessPremiumDepth: true,
    canAccessBehaviorCoaching: true,
    journalEntryHistoryLimit: 500,
    dashboardModuleLimit: 8
  }
};

export const trackedAssetLimits: Record<PlanTier, number> = {
  free: planContracts.free.trackedAssetLimit,
  premium: planContracts.premium.trackedAssetLimit
};

export function getTrackedAssetLimit(plan: PlanTier): number {
  return planContracts[plan].trackedAssetLimit;
}

export function getPlanContract(plan: PlanTier): PlanContract {
  return planContracts[plan];
}
