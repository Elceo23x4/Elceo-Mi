import type { CanonicalBillingCustomer, CanonicalBillingSubscription, BillingLifecycleProviderKind } from './billing-lifecycle';
import type { ElceoAccountEntitlementState, ElceoAccountState, ElceoPlanKind } from './entitlements';

export type BillingPolicyDecisionCode =
  | 'premium_active_ok' | 'premium_trial_ok' | 'premium_paused_restricted' | 'premium_past_due_restricted'
  | 'premium_incomplete_restricted' | 'premium_incomplete_expired_free_fallback' | 'premium_canceled_free_fallback'
  | 'premium_recovered_to_active' | 'free_default_ok' | 'admin_internal_override_preserved';

export type BillingPolicySeverity = 'info' | 'warning' | 'restriction' | 'suspension_candidate';
export type BillingOperationalState = 'healthy' | 'restricted' | 'degraded' | 'free_fallback';

export type BillingPolicyTransition = {
  transitionId: string; subjectKind: 'user'; subjectId: string; providerKind: BillingLifecycleProviderKind;
  billingSubscriptionId: string | null; previousPlanKind: ElceoPlanKind | null; nextPlanKind: ElceoPlanKind;
  previousAccountState: ElceoAccountState | null; nextAccountState: ElceoAccountState; decisionCode: BillingPolicyDecisionCode;
  severity: BillingPolicySeverity; restrictedAccess: boolean; recoveredAccess: boolean; sourceReconciliationRunId: string | null;
  rationale: string; decidedAt: string; createdAt: string;
};

export type BillingPolicySnapshot = {
  generatedAt: string; subjectKind: 'user'; subjectId: string; customer: CanonicalBillingCustomer | null;
  subscription: CanonicalBillingSubscription | null; entitlementState: ElceoAccountEntitlementState;
  latestPolicyTransition: BillingPolicyTransition | null;
};

export type BillingPolicyEvaluation = {
  operationalState: BillingOperationalState; nextPlanKind: ElceoPlanKind; nextAccountState: ElceoAccountState;
  restrictedAccess: boolean; recoveredAccess: boolean; decisionCode: BillingPolicyDecisionCode; severity: BillingPolicySeverity;
  rationale: string;
};
