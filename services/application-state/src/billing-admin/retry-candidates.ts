import type { BillingRetryCandidate, BillingPolicyTransition, BillingReconciliationRun, CanonicalBillingSubscription } from '@elceo/types';

const reasonFrom = (run: BillingReconciliationRun, transition: BillingPolicyTransition | null): BillingRetryCandidate['reason'] => {
  const summary = run.summary.toLowerCase();
  if (run.status === 'failed') return 'latest_reconciliation_failed';
  if (summary.includes('mapping') && summary.includes('fallback')) return 'provider_mapping_fallback_free';
  if (transition?.decisionCode === 'premium_past_due_restricted') return 'restricted_due_to_past_due';
  if (transition?.decisionCode === 'premium_paused_restricted') return 'restricted_due_to_paused';
  if (transition?.decisionCode === 'premium_incomplete_restricted') return 'restricted_due_to_incomplete';
  return 'pending_re_evaluation_after_recovery';
};

export const buildRetryCandidates = (
  runs: BillingReconciliationRun[],
  transitionBySubject: Map<string, BillingPolicyTransition>,
  subBySubject: Map<string, CanonicalBillingSubscription>,
): BillingRetryCandidate[] => runs
  .map((run) => {
    const transition = transitionBySubject.get(run.subjectId) ?? null;
    const sub = subBySubject.get(run.subjectId) ?? null;
    const reason = reasonFrom(run, transition);
    return {
      candidateId: `${run.subjectId}:${reason}`,
      subjectKind: 'user' as const,
      subjectId: run.subjectId,
      providerKind: run.providerKind,
      reason,
      latestReconciliationRunId: run.runId,
      latestPolicyTransitionId: transition?.transitionId ?? null,
      latestSubscriptionState: sub?.state ?? null,
      currentPlanKind: sub?.canonicalPlanKind ?? 'free',
      currentAccountState: transition?.nextAccountState ?? 'active',
      createdAt: run.createdAt,
    };
  })
  .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.candidateId.localeCompare(b.candidateId));
