import assert from 'node:assert/strict';
import { buildOperationalSummary } from '../billing-admin/operational-summary';
import { classifyFailure } from '../billing-admin/failure-classifier';
import { buildRetryCandidates } from '../billing-admin/retry-candidates';
import { buildSubjectSnapshot } from '../billing-admin/subject-snapshot';
import { CanonicalBillingAdminBoundaryService } from '../runtime/canonical-billing-admin-boundary';

export async function runBillingAdminCoreTests() {
  const now = new Date().toISOString();
  const healthy = buildOperationalSummary({ generatedAt: now, totalSubjectsWithBillingState: 2, activePremiumCount: 2, trialingPremiumCount: 0, restrictedPremiumCount: 0, freeFallbackCount: 0, failedRecentReconciliations: 0, degradedRecentReconciliations: 0, providerMappingFallbackCount: 0, recentPolicyRestrictionCount: 0, recentRecoveredCount: 0, latestReconciliationStatus: null, latestPolicyDecisionCode: null });
  assert.equal(healthy.healthState, 'healthy');
  const degraded = buildOperationalSummary({ ...healthy, restrictedPremiumCount: 1 });
  assert.equal(degraded.healthState, 'degraded');
  const critical = buildOperationalSummary({ ...healthy, failedRecentReconciliations: 1, freeFallbackCount: 1 });
  assert.equal(critical.healthState, 'critical');

  const run = { runId: 'r1', providerKind: 'stripe', sourceEventId: 'e1', subjectKind: 'user', subjectId: 'u1', status: 'failed', summary: 'subject resolution failed', customerChanged: false, subscriptionChanged: false, entitlementChanged: false, previousPlanKind: null, nextPlanKind: null, startedAt: now, endedAt: now, createdAt: now } as const;
  assert.equal(classifyFailure(run, null).failureKind, 'subject_resolution_failed');

  const candidates = buildRetryCandidates([run], new Map(), new Map());
  assert.equal(candidates[0]?.reason, 'latest_reconciliation_failed');

  const snapshot = buildSubjectSnapshot('u1', { generatedAt: now, subjectKind: 'user', subjectId: 'u1', customer: null, subscription: null, entitlementState: { subjectKind: 'user', subjectId: 'u1', planKind: 'free', accountState: 'active', internalOverride: false, planStartedAt: null, planEndsAt: null, trialEndsAt: null, updatedAt: now }, latestReconciliationRunId: null }, { generatedAt: now, subjectKind: 'user', subjectId: 'u1', customer: null, subscription: null, entitlementState: { subjectKind: 'user', subjectId: 'u1', planKind: 'free', accountState: 'active', internalOverride: false, planStartedAt: null, planEndsAt: null, trialEndsAt: null, updatedAt: now }, latestPolicyTransition: null }, null, null);
  assert.equal(snapshot.subjectId, 'u1');

  const boundary = new CanonicalBillingAdminBoundaryService();
  assert.ok(boundary.getBillingAdminOperationalSummary);
}
