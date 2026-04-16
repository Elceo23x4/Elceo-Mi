export type PlanTier = 'free' | 'premium';

export const trackedAssetLimits: Record<PlanTier, number> = {
  free: 4,
  premium: 12
};

export function getTrackedAssetLimit(plan: PlanTier): number {
  return trackedAssetLimits[plan];
}
