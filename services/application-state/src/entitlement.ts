import { getTrackedAssetLimit, type PlanTier } from '@elceo/config';
import type { EntitlementState } from '@elceo/types';

export function buildEntitlementState(planTier: PlanTier): EntitlementState {
  return {
    planTier,
    trackedAssetLimit: getTrackedAssetLimit(planTier),
    canAccessPremiumDepth: planTier === 'premium'
  };
}

export function enforceTrackedAssetLimit(planTier: PlanTier, assets: string[]): string[] {
  const limit = getTrackedAssetLimit(planTier);
  return assets.slice(0, limit);
}
