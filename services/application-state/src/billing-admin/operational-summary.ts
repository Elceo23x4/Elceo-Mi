import type { BillingAdminOperationalSummary, BillingPolicyDecisionCode, BillingReconciliationStatus } from '@elceo/types';

export type OperationalInputs = {
  generatedAt: string;
  totalSubjectsWithBillingState: number;
  activePremiumCount: number;
  trialingPremiumCount: number;
  restrictedPremiumCount: number;
  freeFallbackCount: number;
  failedRecentReconciliations: number;
  degradedRecentReconciliations: number;
  providerMappingFallbackCount: number;
  recentPolicyRestrictionCount: number;
  recentRecoveredCount: number;
  latestReconciliationStatus: BillingReconciliationStatus | null;
  latestPolicyDecisionCode: BillingPolicyDecisionCode | null;
};

export const computeHealthState = (i: OperationalInputs): BillingAdminOperationalSummary['healthState'] =>
  (i.failedRecentReconciliations > 0 && (i.freeFallbackCount > 0 || i.recentPolicyRestrictionCount > 0)) ? 'critical'
    : (i.failedRecentReconciliations + i.degradedRecentReconciliations + i.freeFallbackCount + i.restrictedPremiumCount > 0) ? 'degraded'
      : (i.providerMappingFallbackCount + i.recentRecoveredCount > 0) ? 'attention_needed'
        : 'healthy';

export const buildOperationalSummary = (input: OperationalInputs): BillingAdminOperationalSummary => ({ ...input, healthState: computeHealthState(input) });
