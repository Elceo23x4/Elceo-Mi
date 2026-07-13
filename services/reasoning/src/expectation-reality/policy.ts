export const EXPECTATION_REALITY_POLICY_V1 = {
  version: 'expectation-reality-v1' as const,
  horizons: { immediate: 1, confirmation: 3, follow_through: 6 } as const,
  movementBoundaries: { materialVolUnits: 0.5, confirmationVolUnits: 1, strongVolUnits: 1.5 } as const,
  deltaWeights: { direction: 30, path: 20, magnitude: 15, timing: 10, invalidation: 15, confidence: 10 } as const,
  severityThresholds: { none: 0, minor: 15, moderate: 35, major: 60, critical: 80 } as const
};
