import { queryDb } from '../db/client';
import { BillingLifecycleQueryService } from '../billing/query-service';
import { BillingPolicyQueryService } from '../billing-policy/query-service';
import type { BillingAdminOperationalSummary, BillingAdminSubjectSnapshot, BillingPolicyTransition, BillingReconciliationFailureRecord, BillingReconciliationRun, BillingRetryCandidate, CanonicalBillingSubscription } from '@elceo/types';
import { buildOperationalSummary } from './operational-summary';
import { classifyFailure } from './failure-classifier';
import { buildRetryCandidates } from './retry-candidates';
import { buildSubjectSnapshot } from './subject-snapshot';
import { BILLING_ADMIN_DEFAULT_LIMIT, BILLING_ADMIN_MAX_LIMIT } from './constants';

const cap = (limit?: number) => Math.max(1, Math.min(BILLING_ADMIN_MAX_LIMIT, limit ?? BILLING_ADMIN_DEFAULT_LIMIT));

type AggregateRow = {
  total_subjects: number; active_premium: number; trialing_premium: number; restricted_premium: number; free_fallback: number;
  failed_recent: number; degraded_recent: number; provider_fallback: number; policy_restricted_recent: number; policy_recovered_recent: number;
  latest_reconciliation_status: BillingReconciliationRun['status'] | null; latest_policy_decision_code: BillingPolicyTransition['decisionCode'] | null;
};

export class BillingAdminQueryService {
  constructor(private lifecycle: BillingLifecycleQueryService, private policy: BillingPolicyQueryService) {}

  async getBillingAdminOperationalSummary(): Promise<BillingAdminOperationalSummary> {
    const rows = await queryDb<AggregateRow>(`SELECT
      COUNT(*)::int AS total_subjects,
      COUNT(*) FILTER (WHERE s.canonical_plan_kind='premium' AND s.state='active')::int AS active_premium,
      COUNT(*) FILTER (WHERE s.canonical_plan_kind='premium' AND s.state='trialing')::int AS trialing_premium,
      COUNT(*) FILTER (WHERE s.canonical_plan_kind='premium' AND e.account_state='restricted')::int AS restricted_premium,
      COUNT(*) FILTER (WHERE s.canonical_plan_kind='free' OR s.state IN ('canceled','incomplete_expired'))::int AS free_fallback,
      COUNT(*) FILTER (WHERE rr.status='failed')::int AS failed_recent,
      COUNT(*) FILTER (WHERE rr.status IN ('failed','partial_success'))::int AS degraded_recent,
      COUNT(*) FILTER (WHERE rr.summary ILIKE '%mapping%' AND rr.summary ILIKE '%fallback%')::int AS provider_fallback,
      COUNT(*) FILTER (WHERE pt.decision_code IN ('premium_paused_restricted','premium_past_due_restricted','premium_incomplete_restricted'))::int AS policy_restricted_recent,
      COUNT(*) FILTER (WHERE pt.decision_code='premium_recovered_to_active')::int AS policy_recovered_recent,
      (SELECT status FROM app_billing_reconciliation_runs ORDER BY created_at DESC, run_id ASC LIMIT 1) AS latest_reconciliation_status,
      (SELECT decision_code FROM app_billing_policy_transitions ORDER BY decided_at DESC, transition_id ASC LIMIT 1) AS latest_policy_decision_code
    FROM app_billing_subscriptions_lifecycle s
    LEFT JOIN app_account_entitlements e ON e.subject_kind=s.subject_kind AND e.subject_id=s.subject_id
    LEFT JOIN LATERAL (
      SELECT status, summary FROM app_billing_reconciliation_runs r WHERE r.subject_kind=s.subject_kind AND r.subject_id=s.subject_id ORDER BY r.created_at DESC, r.run_id ASC LIMIT 1
    ) rr ON true
    LEFT JOIN LATERAL (
      SELECT decision_code FROM app_billing_policy_transitions p WHERE p.subject_kind=s.subject_kind AND p.subject_id=s.subject_id ORDER BY p.decided_at DESC, p.transition_id ASC LIMIT 1
    ) pt ON true`);
    const row = rows[0];
    return buildOperationalSummary({ generatedAt: new Date().toISOString(), totalSubjectsWithBillingState: row?.total_subjects ?? 0, activePremiumCount: row?.active_premium ?? 0, trialingPremiumCount: row?.trialing_premium ?? 0, restrictedPremiumCount: row?.restricted_premium ?? 0, freeFallbackCount: row?.free_fallback ?? 0, failedRecentReconciliations: row?.failed_recent ?? 0, degradedRecentReconciliations: row?.degraded_recent ?? 0, providerMappingFallbackCount: row?.provider_fallback ?? 0, recentPolicyRestrictionCount: row?.policy_restricted_recent ?? 0, recentRecoveredCount: row?.policy_recovered_recent ?? 0, latestReconciliationStatus: row?.latest_reconciliation_status ?? null, latestPolicyDecisionCode: row?.latest_policy_decision_code ?? null });
  }

  async listRecentBillingReconciliationFailures(limit?: number): Promise<BillingReconciliationFailureRecord[]> {
    const rows = await queryDb<Array<BillingReconciliationRun & { transition_json: string | null }>[number]>(`SELECT r.run_json::text AS run_json, p.transition_json::text AS transition_json
      FROM app_billing_reconciliation_runs r
      LEFT JOIN app_billing_policy_transitions p ON p.source_reconciliation_run_id=r.run_id
      WHERE r.status='failed' OR r.summary ILIKE '%mapping%' OR p.decision_code IN ('premium_paused_restricted','premium_past_due_restricted','premium_incomplete_restricted','premium_incomplete_expired_free_fallback','premium_canceled_free_fallback')
      ORDER BY r.created_at DESC, r.run_id ASC
      LIMIT $1`, [cap(limit)]);
    return rows
      .map((row) => {
        const run = JSON.parse((row as unknown as { run_json: string }).run_json) as BillingReconciliationRun;
        const transitionJson = (row as unknown as { transition_json: string | null }).transition_json;
        const transition = transitionJson ? (JSON.parse(transitionJson) as BillingPolicyTransition) : null;
        return classifyFailure(run, transition);
      })
      .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt) || a.failureId.localeCompare(b.failureId));
  }

  async listBillingRetryCandidates(limit?: number): Promise<BillingRetryCandidate[]> {
    const runs = await queryDb<{ run_json: string }>(`SELECT run_json::text AS run_json FROM app_billing_reconciliation_runs ORDER BY created_at DESC, run_id ASC LIMIT $1`, [BILLING_ADMIN_MAX_LIMIT]);
    const transitions = await queryDb<{ transition_json: string }>(`SELECT transition_json::text AS transition_json FROM app_billing_policy_transitions ORDER BY decided_at DESC, transition_id ASC LIMIT $1`, [BILLING_ADMIN_MAX_LIMIT]);
    const subs = await queryDb<{ subscription_json: string }>(`SELECT row_to_json(s)::text AS subscription_json FROM app_billing_subscriptions_lifecycle s ORDER BY updated_at DESC, subscription_id ASC LIMIT $1`, [BILLING_ADMIN_MAX_LIMIT]);
    const runModels = runs.map((r) => JSON.parse(r.run_json) as BillingReconciliationRun);
    const transitionBySubject = new Map<string, BillingPolicyTransition>();
    transitions.map((t) => JSON.parse(t.transition_json) as BillingPolicyTransition).forEach((t) => {
      if (!transitionBySubject.has(t.subjectId)) transitionBySubject.set(t.subjectId, t);
    });
    const subBySubject = new Map<string, CanonicalBillingSubscription>();
    subs.map((s) => JSON.parse(s.subscription_json) as { subject_id: string; subject_kind: 'user'; provider_kind: CanonicalBillingSubscription['providerKind']; subscription_id: string; provider_subscription_id: string; provider_price_id: string | null; provider_product_id: string | null; provider_plan_code: string | null; canonical_plan_kind: CanonicalBillingSubscription['canonicalPlanKind']; plan_source: CanonicalBillingSubscription['planSource']; state: CanonicalBillingSubscription['state']; current_period_start: string | null; current_period_end: string | null; trial_ends_at: string | null; canceled_at: string | null; will_cancel_at_period_end: boolean; latest_provider_event_id: string | null; updated_at: string }).forEach((s) => {
      if (!subBySubject.has(s.subject_id)) subBySubject.set(s.subject_id, { subscriptionId: s.subscription_id, subjectKind: s.subject_kind, subjectId: s.subject_id, providerKind: s.provider_kind, providerSubscriptionId: s.provider_subscription_id, providerPriceId: s.provider_price_id, providerProductId: s.provider_product_id, providerPlanCode: s.provider_plan_code, canonicalPlanKind: s.canonical_plan_kind, planSource: s.plan_source, state: s.state, currentPeriodStart: s.current_period_start, currentPeriodEnd: s.current_period_end, trialEndsAt: s.trial_ends_at, canceledAt: s.canceled_at, willCancelAtPeriodEnd: s.will_cancel_at_period_end, latestProviderEventId: s.latest_provider_event_id, updatedAt: s.updated_at });
    });
    return buildRetryCandidates(runModels, transitionBySubject, subBySubject).slice(0, cap(limit));
  }

  async getBillingAdminSubjectSnapshot(subjectKind: 'user', subjectId: string): Promise<BillingAdminSubjectSnapshot> {
    const lifecycleSnapshot = await this.lifecycle.getBillingLifecycleSnapshot(subjectKind, subjectId);
    const policySnapshot = await this.policy.getBillingPolicySnapshot(subjectKind, subjectId);
    const latestRun = await this.lifecycle.getLatestBillingReconciliationRun(subjectKind, subjectId);
    const latestTransition = await this.policy.getLatestBillingPolicyTransition(subjectKind, subjectId);
    return buildSubjectSnapshot(subjectId, lifecycleSnapshot, policySnapshot, latestRun, latestTransition);
  }
}

export { classifyFailure };
