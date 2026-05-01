import type { BillingPolicyTransition, BillingReconciliationFailureKind, BillingReconciliationFailureRecord, BillingReconciliationRun } from '@elceo/types';
import { serializeMetadata } from './serialization';

const restrictedCodes = new Set(['premium_paused_restricted', 'premium_past_due_restricted', 'premium_incomplete_restricted']);
const freeFallbackCodes = new Set(['premium_incomplete_expired_free_fallback', 'premium_canceled_free_fallback']);

const classifyFailureKind = (run: BillingReconciliationRun, transition: BillingPolicyTransition | null): BillingReconciliationFailureKind => {
  const summary = run.summary.toLowerCase();
  if (run.status === 'failed' && summary.includes('subject')) return 'subject_resolution_failed';
  if (summary.includes('mapping') && summary.includes('fallback')) return 'provider_mapping_fallback_free';
  if (summary.includes('mapping') && summary.includes('missing')) return 'provider_mapping_missing';
  if (transition && restrictedCodes.has(transition.decisionCode)) return 'policy_restricted';
  if (transition && freeFallbackCodes.has(transition.decisionCode)) return 'policy_free_fallback';
  if (run.status === 'failed') return 'unknown_failure';
  return 'provider_mapping_fallback_free';
};

export const classifyFailure = (run: BillingReconciliationRun, transition: BillingPolicyTransition | null): BillingReconciliationFailureRecord => {
  const failureKind = classifyFailureKind(run, transition);
  return {
    failureId: `${run.runId}:${failureKind}`,
    subjectKind: 'user',
    subjectId: run.subjectId,
    providerKind: run.providerKind,
    reconciliationRunId: run.runId,
    sourceEventId: run.sourceEventId,
    failureKind,
    severity: transition?.severity ?? (run.status === 'failed' ? 'restriction' : 'warning'),
    summary: run.summary,
    retryCandidate: failureKind !== 'policy_free_fallback',
    occurredAt: run.createdAt,
    metadataJson: serializeMetadata({ runStatus: run.status, decisionCode: transition?.decisionCode ?? null }),
  };
};
