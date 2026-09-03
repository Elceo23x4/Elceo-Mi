import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { guardRouteCommercialEntitlement } from '../lib/server/access/route-entitlement';
import { buildRouteInventory, type RuntimeEnforcementExpectation, type RouteRuntimeAssertion } from '../lib/server/access/route-policy-inventory';
import { clearAuthTestOverrides, setAuthTestOverrides } from '../lib/server/auth/subject';
import { setCompositionTestOverrides } from './stubs/composition';
import { commercialMutationCounts, expireStepUpChallengeFreshness, resetCommercialMutationCounts, setCommercialPersistenceFailureMode, setStepUpPersistenceFailureMode } from './stubs/application-state';

import { createDashboardGetHandler } from '../lib/dashboard-route-handler';
import type { withDashboardReadAdmission } from '../lib/inbound-read-admission';
import { executeAdmittedDashboardRead } from '../lib/dashboard-admission-execution';
import { formatAvailableScore } from '../lib/display-intelligence';
import * as workspaceCurrentRoute from '../app/api/workspace/current/route';
import * as workspaceRefreshRoute from '../app/api/workspace/refresh/route';
import * as workspaceFreshnessRoute from '../app/api/workspace/freshness/route';
import * as workspaceHistoryRoute from '../app/api/workspace/history/route';
import * as workspaceAgendaRoute from '../app/api/workspace/agenda/route';

import * as journalCasesRoute from '../app/api/journal/cases/route';
import * as journalPlanRoute from '../app/api/journal/cases/[caseId]/plan/route';
import * as journalAdjustRoute from '../app/api/journal/cases/[caseId]/adjust/route';
import * as journalCancelRoute from '../app/api/journal/cases/[caseId]/cancel/route';
import * as journalExecuteRoute from '../app/api/journal/cases/[caseId]/execute/route';
import * as journalPartialCloseRoute from '../app/api/journal/cases/[caseId]/partial-close/route';
import * as journalCloseRoute from '../app/api/journal/cases/[caseId]/close/route';
import * as journalReviewRoute from '../app/api/journal/cases/[caseId]/review/route';
import * as journalReplayRoute from '../app/api/journal/cases/[caseId]/replay/route';
import * as journalInfluenceGenerateRoute from '../app/api/journal/influence/generate/route';

import * as watchlistRoute from '../app/api/portfolio/watchlist/route';
import * as watchlistEntryRoute from '../app/api/portfolio/watchlist/[entryId]/route';
import * as watchlistStatusRoute from '../app/api/portfolio/watchlist/[entryId]/status/route';
import * as watchlistThesisRoute from '../app/api/portfolio/watchlist/[entryId]/thesis-health/route';
import * as watchlistArchiveRoute from '../app/api/portfolio/watchlist/[entryId]/archive/route';
import * as positionsRoute from '../app/api/portfolio/positions/route';
import * as positionOpenRoute from '../app/api/portfolio/positions/[positionId]/open/route';
import * as positionCloseRoute from '../app/api/portfolio/positions/[positionId]/close/route';
import * as actionsRoute from '../app/api/portfolio/actions/route';
import * as actionCompleteRoute from '../app/api/portfolio/actions/[actionId]/complete/route';
import * as actionDismissRoute from '../app/api/portfolio/actions/[actionId]/dismiss/route';
import * as portfolioSnapshotGenerateRoute from '../app/api/portfolio/snapshot/generate/route';
import * as portfolioReplayRoute from '../app/api/portfolio/replay/route';

import * as analyticsLatestRoute from '../app/api/analytics/latest/route';
import * as analyticsGenerateRoute from '../app/api/analytics/generate/route';
import * as analyticsTopSetupsRoute from '../app/api/analytics/top-setups/route';
import * as analyticsTopBehaviorsRoute from '../app/api/analytics/top-behaviors/route';
import * as coachingFocusRoute from '../app/api/coaching/focus/route';
import * as coachingActionPlanRoute from '../app/api/coaching/action-plan/route';
import * as coachingGenerateRoute from '../app/api/coaching/generate/route';

import * as notificationsSummaryRoute from '../app/api/notifications/summary/route';
import * as notificationsInboxRoute from '../app/api/notifications/inbox/route';
import * as notificationsTargetsRoute from '../app/api/notifications/targets/route';
import * as notificationsTargetEnableRoute from '../app/api/notifications/targets/[targetId]/enable/route';
import * as notificationsTargetDisableRoute from '../app/api/notifications/targets/[targetId]/disable/route';
import * as notificationsSubscriptionsRoute from '../app/api/notifications/subscriptions/route';
import * as notificationsSubscriptionRoute from '../app/api/notifications/subscriptions/[subscriptionId]/route';
import * as notificationsVerificationIssueRoute from '../app/api/notifications/verification/issue/route';
import * as notificationsVerificationConsumeRoute from '../app/api/notifications/verification/consume/route';
import * as notificationsHealthRoute from '../app/api/notifications/health/route';
import * as notificationsDispatchRoute from '../app/api/notifications/delivery/dispatch/route';

import * as refreshLatestRoute from '../app/api/refresh/latest/route';
import * as refreshHistoryRoute from '../app/api/refresh/history/route';
import * as refreshFreshnessRoute from '../app/api/refresh/freshness/route';
import * as refreshRunRoute from '../app/api/refresh/run/route';
import * as opsExpireRoute from '../app/api/ops/notifications/expire-verifications/route';
import * as opsFeedbackRoute from '../app/api/ops/notifications/process-feedback/route';
import * as adminSystemSummaryRoute from '../app/api/admin/system-summary/route';
import * as adminFreshnessRoute from '../app/api/admin/freshness/route';
import * as adminOpsRoute from '../app/api/admin/ops/route';
import * as adminProvidersRoute from '../app/api/admin/providers/route';
import * as adminAuditRoute from '../app/api/admin/audit/route';
import * as adminCommercialMetricsRoute from '../app/api/admin/commercial/metrics/route';
import * as adminCommercialGiftFocusPlanRoute from '../app/api/admin/commercial/users/[userId]/gift-focus-plan/route';
import * as adminCommercialRetractFocusGiftRoute from '../app/api/admin/commercial/users/[userId]/retract-focus-gift/route';
import * as adminCommercialRestrictUserRoute from '../app/api/admin/commercial/users/[userId]/restrict/route';
import * as adminCommercialControlSnapshotRoute from '../app/api/admin/commercial/users/[userId]/control-snapshot/route';
import * as adminStepUpChallengeRoute from '../app/api/admin/security/step-up/challenge/route';
import * as adminStepUpVerifyRoute from '../app/api/admin/security/step-up/verify/route';
import * as adminStepUpReadinessRoute from '../app/api/admin/security/step-up/readiness/route';
import * as accountEntitlementsRoute from '../app/api/account/entitlements/route';
import * as accountUsageRoute from '../app/api/account/usage/route';
import * as accountAccessDecisionsRoute from '../app/api/account/access-decisions/route';
import * as accountAccessCheckRoute from '../app/api/account/access-check/route';
import * as accountProfileSocialIdentifiersRoute from '../app/api/account/profile/social-identifiers/route';
import * as adminEntitlementPlanRoute from '../app/api/admin/entitlements/plan/route';
import * as adminEntitlementStateRoute from '../app/api/admin/entitlements/state/route';
import * as adminEntitlementOverrideRoute from '../app/api/admin/entitlements/override/route';

import * as accountBillingRoute from '../app/api/account/billing/route';
import * as accountBillingPolicyRoute from '../app/api/account/billing/policy/route';
import * as accountBillingPolicyTransitionsRoute from '../app/api/account/billing/policy/transitions/route';
import * as accountBillingReconciliationRunsRoute from '../app/api/account/billing/reconciliation-runs/route';
import * as adminBillingTrialRoute from '../app/api/admin/billing/trial/route';
import * as adminBillingActivateRoute from '../app/api/admin/billing/activate/route';
import * as adminBillingRenewRoute from '../app/api/admin/billing/renew/route';
import * as adminBillingChangePlanRoute from '../app/api/admin/billing/change-plan/route';
import * as adminBillingPastDueRoute from '../app/api/admin/billing/past-due/route';
import * as adminBillingCancelAtPeriodEndRoute from '../app/api/admin/billing/cancel-at-period-end/route';
import * as adminBillingExpireRoute from '../app/api/admin/billing/expire/route';
import * as adminBillingPauseRoute from '../app/api/admin/billing/pause/route';
import * as adminBillingResumeRoute from '../app/api/admin/billing/resume/route';

import * as internalBillingProviderEventsRoute from '../app/api/internal/billing/provider-events/route';
import * as internalBillingProviderReplayRoute from '../app/api/internal/billing/provider-events/replay/route';
import * as internalBillingReconcileRoute from '../app/api/internal/billing/reconcile/route';
import * as internalBillingPolicyEvaluateRoute from '../app/api/internal/billing/policy/evaluate/route';
import * as adminBillingProviderPlanMappingRoute from '../app/api/admin/billing/provider-plan-mapping/route';
import * as adminBillingProviderPlanMappingsRoute from '../app/api/admin/billing/provider-plan-mappings/route';
import * as adminBillingProviderEventsRoute from '../app/api/admin/billing/provider-events/route';
import * as adminBillingPolicyRoute from '../app/api/admin/billing/policy/route';
import * as adminBillingPolicyTransitionsRoute from '../app/api/admin/billing/policy/transitions/route';
import * as adminBillingOperationsSummaryRoute from '../app/api/admin/billing/operations/summary/route';
import * as adminBillingOperationsFailuresRoute from '../app/api/admin/billing/operations/failures/route';
import * as adminBillingOperationsRetryCandidatesRoute from '../app/api/admin/billing/operations/retry-candidates/route';
import * as adminBillingOperationsSubjectRoute from '../app/api/admin/billing/operations/subject/route';
import * as internalBillingReconcileRetryRoute from '../app/api/internal/billing/reconcile/retry/route';
import * as adminBillingOrchestrationLatestRoute from '../app/api/admin/billing/orchestration/latest/route';
import * as adminBillingOrchestrationRunsRoute from '../app/api/admin/billing/orchestration/runs/route';

import * as marketEvidencePayloadsRoute from '../app/api/admin/market-evidence/payloads/route';
import * as marketEvidenceProviderRequestRoute from '../app/api/admin/market-evidence/provider-request/route';
import * as marketEvidenceProviderResponseRoute from '../app/api/admin/market-evidence/provider-response/route';
import * as marketEvidencePayloadReplayRoute from '../app/api/admin/market-evidence/payload-replay/route';
import * as marketEvidenceQualityRoute from '../app/api/admin/market-evidence/quality/route';
import * as marketEvidenceReasoningInputRoute from '../app/api/admin/market-evidence/reasoning-input/route';
import * as marketEvidenceWeightedRoute from '../app/api/admin/market-evidence/weighted/route';
import * as marketEvidenceCognitionRoute from '../app/api/admin/market-evidence/cognition/route';
import * as adminSeoFeedRoute from '../app/api/admin/seo/feed/route';
import * as adminSeoSitemapRoute from '../app/api/admin/seo/sitemap/route';
import * as adminBillingOrchestrationSubjectRoute from '../app/api/admin/billing/orchestration/subject/route';
import * as internalBillingOrchestrationRetryRoute from '../app/api/internal/billing/orchestration/retry/route';
import * as internalTiingoFixtureIngestRoute from '../app/api/internal/market-evidence/tiingo/fixture-ingest/route';
import * as scheduledIngestionPoliciesRoute from '../app/api/admin/market-evidence/scheduled-ingestion/policies/route';
import * as scheduledIngestionRunsRoute from '../app/api/admin/market-evidence/scheduled-ingestion/runs/route';
import * as scheduledIngestionReplayRoute from '../app/api/admin/market-evidence/scheduled-ingestion/replay/route';
import * as scheduledIngestionDryRunRoute from '../app/api/admin/market-evidence/scheduled-ingestion/dry-run/route';
import * as scheduledIngestionInspectionRoute from '../app/api/admin/market-evidence/scheduled-ingestion/inspection/route';
import * as marketEvidenceInspectionRoute from '../app/api/admin/market-evidence/inspection/route';

const subject = { subjectKind: 'user' as const, subjectId: 'user-1', userId: 'user-1' };

let latestWorkspaceSubjectId: string | null = null;
let blockedFeatures = new Set<string>();
let usageIncremented: string[] = [];

let securityDecisionMode: 'allowed' | 'rate_limited' | 'idempotency_conflict' | 'replayed' = 'allowed';
let securityCompletedCount = 0;
let securityCompletedWithResponseCount = 0;
let replayMode: 'stored' | 'unavailable' | 'malformed' = 'stored';
let replayResponseJson = '{"ok":true,"data":{"run":{"runId":"replayed"}}}';
let securityFailedCount = 0;
let securityAuditCount = 0;
let latestSecurityActionKind: string | null = null;
const idempotencyRecords = new Map<string, { requestHash: string; responseJson: string; httpStatus: number }>();

function assertNoSensitiveLeak(response: unknown): void {
  const serialized = JSON.stringify(response).toLowerCase();
  assert.equal(serialized.includes('select * from users'), false);
  assert.equal(serialized.includes("password='secret'"), false);
  assert.equal(serialized.includes('at object.<anonymous>'), false);
  assert.equal(serialized.includes('sk_test_'), false);
  assert.equal(serialized.includes('elceo_internal_api_token='), false);
}

const journalCase = {
  identity: { caseId: 'case-1', subjectKind: 'user' as const, subjectId: subject.subjectId, asset: 'XAU/USD', timeframe: 'H1', title: 'T' }
};

const mockApplicationStateRuntime = {
  journal: {
    listJournalCases: async () => [journalCase],
    createDraftCaseFromReasoningContext: async () => journalCase,
    createDraftCase: async () => journalCase,
    planCase: async (_subjectKind: string, _subjectId: string, caseId: string) => {
      if (caseId === 'case-foreign') throw new Error('not_found');
      return journalCase;
    },
    adjustExecution: async () => journalCase,
    markExecuted: async () => journalCase,
    markPartiallyClosed: async () => journalCase,
    closeCase: async () => journalCase,
    cancelCase: async () => journalCase,
    reviewCase: async () => journalCase,
    getJournalCaseReplay: async () => ({ caseData: journalCase, revisions: [], caseRecord: {} })
  },
  journalInfluence: {
    getLatestJournalInfluenceSnapshot: async () => null,
    generateJournalInfluenceSnapshot: async () => ({ snapshotId: 'ji-1' })
  },
  portfolio: {
    listCurrentWatchlist: async () => [],
    createWatchlistEntry: async () => ({ entryId: 'entry-1' }),
    updateWatchlistEntry: async (_subjectKind: string, _subjectId: string, entryId: string) => {
      if (entryId === 'entry-foreign') throw new Error('not_found');
      return { entryId: 'entry-1' };
    },
    changeWatchlistStatus: async () => ({ entryId: 'entry-1' }),
    changeWatchlistThesisHealth: async () => ({ entryId: 'entry-1' }),
    archiveWatchlistEntry: async () => ({ entryId: 'entry-1' }),
    listOpenPositions: async () => [],
    createProposedPosition: async () => ({ positionId: 'pos-1' }),
    openPosition: async (_subjectKind: string, _subjectId: string, positionId: string) => {
      if (positionId === 'pos-foreign') throw new Error('not_found');
      return { positionId: 'pos-1' };
    },
    closePosition: async () => ({ positionId: 'pos-1' }),
    listOpenActionQueue: async () => [],
    createActionItem: async () => ({ actionId: 'act-1' }),
    completeActionItem: async () => ({ actionId: 'act-1' }),
    dismissActionItem: async () => ({ actionId: 'act-1' }),
    generatePortfolioSnapshot: async () => ({ snapshotId: 'ps-1' }),
    getPortfolioEntityReplay: async () => ({ current: { id: 'x' }, revisions: [] })
  },
  workspace: {
    getLatestWorkspaceSnapshot: async () => null,
    listWorkspaceSnapshots: async (_kind: 'user' | 'workspace' | 'ops', subjectId: string) => { latestWorkspaceSubjectId = subjectId; return []; },
    getCurrentWorkspaceAgenda: async () => []
  },
  admin: {
    getAdminSystemSummary: async () => ({ overallHealth: 'healthy' }),
    getAdminFreshnessSummary: async () => ({ totalDomains: 0 }),
    getAdminOpsSummary: async () => ({ totalRecentRuns: 1 }),
    getAdminProviderCapabilitySummary: async () => ({ notificationProviders: [], ingestionProviders: [] }),
    getAdminAuditTimeline: async () => ({ events: [] })
  },
  refresh: {
    runSnapshotRefresh: async () => ({ refreshRunId: 'rr-1' }),
    listSnapshotFreshnessForSubject: async () => [],
    getRefreshAttentionSummary: async () => ({ overallFreshnessState: 'fresh' }),
    listDomainsNeedingRefresh: async () => [],
    getLatestSnapshotRefreshRun: async () => null,
    listSnapshotRefreshRuns: async () => []
  },
  billingLifecycle: {
    getBillingLifecycleSnapshot: async (_kind: 'user', sid: string) => ({ generatedAt: '2026-01-01T00:00:00.000Z', subjectKind: 'user', subjectId: sid, customer: null, subscription: null, entitlementState: { subjectKind: 'user', subjectId: sid, planKind: 'premium', accountState: 'active', internalOverride: false }, latestReconciliationRunId: 'run-1' }),
    listRecentBillingReconciliationRuns: async (_kind: 'user', sid: string) => ([{ runId: 'run-1', providerKind: 'stripe', sourceEventId: 'evt-1', subjectKind: 'user', subjectId: sid, status: 'success', summary: 'ok', customerChanged: true, subscriptionChanged: true, entitlementChanged: true, previousPlanKind: 'free', nextPlanKind: 'premium', startedAt: '2026-01-01T00:00:00.000Z', endedAt: '2026-01-01T00:00:01.000Z', createdAt: '2026-01-01T00:00:01.000Z' }]),
    reconcileProviderEvent: async (providerKind: string, sourceEventId: string, subjectId?: string) => ({ runId: 'run-2', providerKind, sourceEventId, subjectKind: 'user', subjectId: subjectId ?? 'user-1', status: 'success', summary: 'ok', customerChanged: false, subscriptionChanged: true, entitlementChanged: true, previousPlanKind: 'free', nextPlanKind: 'premium', startedAt: '2026-01-01T00:00:00.000Z', endedAt: '2026-01-01T00:00:01.000Z', createdAt: '2026-01-01T00:00:01.000Z' })
  },


  billingOrchestration: {
    getLatestBillingOrchestrationRun: async (_kind: 'user', sid: string) => ({ runId: `or-${sid}` }),
    listRecentBillingOrchestrationRuns: async (_kind: 'user', sid: string, limit?: number) => ([{ runId: `or-list-${sid}-${limit ?? 0}` }]),
    getBillingOrchestrationSubjectSnapshot: async (_kind: 'user', sid: string) => ({ subjectId: sid, generatedAt: '2026-01-01T00:00:00.000Z' }),
    runRetryForSubject: async (_kind: 'user', sid: string) => ({ runId: `retry-${sid}` })
  },
  billingAdmin: {
    getBillingAdminOperationalSummary: async () => ({ healthState: 'healthy', totalSubjectsWithBillingState: 1 }),
    listRecentBillingReconciliationFailures: async (_limit?: number) => ([{ failureId: 'f-1' }]),
    listBillingRetryCandidates: async (_limit?: number) => ([{ subjectId: 'user-2', providerKind: 'stripe', latestReconciliationRunId: 'evt-1' }]),
    getBillingAdminSubjectSnapshot: async (_kind: 'user', sid: string) => ({ subjectId: sid })
  },
  billingPolicy: {
    getBillingPolicySnapshot: async (_kind: 'user', sid: string) => ({ generatedAt: '2026-01-01T00:00:00.000Z', subjectKind: 'user', subjectId: sid, customer: null, subscription: null, entitlementState: { subjectKind: 'user', subjectId: sid, planKind: 'premium', accountState: 'active', internalOverride: false }, latestPolicyTransition: null }),
    listRecentBillingPolicyTransitions: async (_kind: 'user', sid: string, limit?: number) => ([{ transitionId: `bpt-${limit ?? 0}`, subjectKind: 'user', subjectId: sid }]),
    evaluateBillingPolicyForSubject: async (_kind: 'user', sid: string, sourceReconciliationRunId?: string) => ({ transition: { transitionId: 'transition-1', subjectKind: 'user', subjectId: sid, sourceReconciliationRunId: sourceReconciliationRunId ?? null } })
  },
  billing: {
    getLatestBillingSubscription: async () => ({ subscriptionId: 'sub-1' }),
    getBillingCommercialState: async () => ({ currentPlanKind: 'premium' }),
    listBillingEventsForSubject: async () => [{ eventId: 'be-1' }],
    startTrial: async () => ({ subscriptionId: 'sub-1', subscriptionState: 'trialing' }),
    activatePaidPlan: async () => ({ subscriptionId: 'sub-1', subscriptionState: 'active' }),
    renewPaidPlan: async () => ({ subscriptionId: 'sub-1', subscriptionState: 'active' }),
    changePlan: async () => ({ subscriptionId: 'sub-1', planKind: 'premium' }),
    markPastDue: async () => ({ subscriptionId: 'sub-1', subscriptionState: 'past_due' }),
    cancelAtPeriodEnd: async () => ({ subscriptionId: 'sub-1', cancelAtPeriodEnd: true }),
    expireSubscription: async () => ({ subscriptionId: 'sub-1', subscriptionState: 'expired' }),
    pauseSubscription: async () => ({ subscriptionId: 'sub-1', subscriptionState: 'paused' }),
    resumeSubscription: async () => ({ subscriptionId: 'sub-1', subscriptionState: 'active' })
  },
  paymentProviders: {
    ingestExternalEvent: async () => ({ accepted: true, deduplicated: false, translated: true, externalEventId: 'evt-1', providerKind: 'stripe', processingResultCode: 'translated_subscription_created', linkedBillingSubscriptionId: 'sub-1', linkedSubjectId: 'user-1', processedAt: '2026-01-01T00:00:00.000Z' }),
    replayUnprocessedEvents: async () => [{ accepted: true, deduplicated: false, translated: true, externalEventId: 'evt-2', providerKind: 'stripe', processingResultCode: 'translated_subscription_updated', linkedBillingSubscriptionId: 'sub-1', linkedSubjectId: 'user-1', processedAt: '2026-01-01T00:00:00.000Z' }],
    upsertProviderPlanMapping: async () => ({ providerKind: 'stripe', externalPriceId: 'price_1', mappedPlanKind: 'premium', interval: 'month' }),
    listProviderPlanMappings: async () => [{ providerKind: 'stripe', externalPriceId: 'price_1', mappedPlanKind: 'premium', interval: 'month' }],
    listExternalEventsForSubject: async () => [{ externalEventId: 'evt-subject' }],
    listUnprocessedExternalEvents: async () => [{ externalEventId: 'evt-unprocessed' }]
  },

  security: {
    evaluateSecurityControl: async (_params: { actionKind: string; actorKind: string; actorId: string; subjectId?: string | null; idempotencyKey?: string | null; requestHash?: string | null; routePath?: string; method?: string }) => {
      latestSecurityActionKind = _params.actionKind;
      const idempotencyKey = _params.idempotencyKey ?? null;
      const requestHash = _params.requestHash ?? '';
      if (securityDecisionMode === 'rate_limited') return { decisionId: 'sec-rate', actionKind: _params.actionKind, actorKind: _params.actorKind, actorId: _params.actorId, subjectId: _params.subjectId, status: 'blocked', blockReason: 'rate_limit_exceeded', idempotencyKey, rateLimitPolicyKey: 'p', currentCount: 60, maxCount: 60, decidedAt: '2026-01-01T00:00:00.000Z', metadataJson: '{}' };
      if (securityDecisionMode === 'idempotency_conflict') return { decisionId: 'sec-idem', actionKind: _params.actionKind, actorKind: _params.actorKind, actorId: _params.actorId, subjectId: _params.subjectId, status: 'blocked', blockReason: 'idempotency_conflict', idempotencyKey, rateLimitPolicyKey: null, currentCount: null, maxCount: null, decidedAt: '2026-01-01T00:00:00.000Z', metadataJson: '{}' };
      if (securityDecisionMode === 'replayed') return { decisionId: 'sec-replay', actionKind: _params.actionKind, actorKind: _params.actorKind, actorId: _params.actorId, subjectId: _params.subjectId, status: 'replayed', blockReason: null, idempotencyKey, rateLimitPolicyKey: null, currentCount: null, maxCount: null, decidedAt: '2026-01-01T00:00:00.000Z', metadataJson: '{}' };
      if (idempotencyKey) {
        const existing = idempotencyRecords.get(idempotencyKey);
        if (existing?.requestHash === requestHash) return { decisionId: 'sec-replay', actionKind: _params.actionKind, actorKind: _params.actorKind, actorId: _params.actorId, subjectId: _params.subjectId, status: 'replayed', blockReason: null, idempotencyKey, rateLimitPolicyKey: null, currentCount: null, maxCount: null, decidedAt: '2026-01-01T00:00:00.000Z', metadataJson: '{}' };
        if (existing) return { decisionId: 'sec-idem', actionKind: _params.actionKind, actorKind: _params.actorKind, actorId: _params.actorId, subjectId: _params.subjectId, status: 'blocked', blockReason: 'idempotency_conflict', idempotencyKey, rateLimitPolicyKey: null, currentCount: null, maxCount: null, decidedAt: '2026-01-01T00:00:00.000Z', metadataJson: '{}' };
      }
      return { decisionId: 'sec-allow', actionKind: _params.actionKind, actorKind: _params.actorKind, actorId: _params.actorId, subjectId: _params.subjectId, status: 'allowed', blockReason: null, idempotencyKey, rateLimitPolicyKey: null, currentCount: null, maxCount: null, decidedAt: '2026-01-01T00:00:00.000Z', metadataJson: '{}' };
    },
    completeIdempotentAction: async (_params: { idempotencyKey: string; responseHash: string; nowIso: string }) => { securityCompletedCount += 1; },
    completeIdempotentActionWithResponse: async (_params: { idempotencyKey: string; requestHash: string; responseHash: string; httpStatus: number; responseJson: string; completedAt: string }) => { securityCompletedWithResponseCount += 1; securityCompletedCount += 1; replayResponseJson = _params.responseJson; idempotencyRecords.set(_params.idempotencyKey, { requestHash: _params.requestHash, responseJson: _params.responseJson, httpStatus: _params.httpStatus }); },
    getIdempotencyReplayResult: async (_idempotencyKey: string, _requestHash: string, _asOfIso?: string) => {
      if (replayMode === 'unavailable') return { replayable: false, reason: 'no_completed_response', completedAt: null, httpStatus: null, responseJson: null };
      if (replayMode === 'malformed') return { replayable: true, reason: 'completed_response_found', completedAt: '2026-01-01T00:00:00.000Z', httpStatus: 200, responseJson: '{' };
      const existing = idempotencyRecords.get(_idempotencyKey);
      if (existing?.requestHash === _requestHash) return { replayable: true, reason: 'completed_response_found', completedAt: '2026-01-01T00:00:00.000Z', httpStatus: existing.httpStatus, responseJson: existing.responseJson };
      return { replayable: true, reason: 'completed_response_found', completedAt: '2026-01-01T00:00:00.000Z', httpStatus: 200, responseJson: replayResponseJson };
    },
    failIdempotentAction: async (_params: { idempotencyKey: string; nowIso: string; metadata?: Record<string, unknown> }) => { securityFailedCount += 1; },
    recordSecurityAuditEvent: async (_params: { actorKind: string; actorId: string; actionKind: string }) => { securityAuditCount += 1; return { ok: true }; }
  },
  entitlements: {
    decideFeatureAccess: async (_kind: 'user', _subjectId: string, feature: string) => ({
      decisionId: `d-${feature}`,
      feature,
      subjectKind: 'user' as const,
      subjectId: subject.subjectId,
      planKind: 'premium' as const,
      accountState: 'active' as const,
      accessLevel: blockedFeatures.has(feature) ? 'blocked' as const : 'allowed' as const,
      reasonCode: blockedFeatures.has(feature) ? 'feature_not_in_plan' : 'feature_allowed',
      usageCounterKey: null,
      currentUsage: null,
      limitMax: null,
      decidedAt: '2026-01-01T00:00:00.000Z'
    }),
    incrementUsageForFeature: async (_kind: 'user', _subjectId: string, feature: string) => { usageIncremented.push(feature); return { counterId: `c-${feature}` }; },
    getAccountEntitlementState: async () => ({ subjectKind: 'user' as const, subjectId: subject.subjectId, planKind: 'premium' as const, accountState: 'active' as const, internalOverride: false }),
    getCurrentEntitlementProfile: async () => ({ planKind: 'premium' as const, accountState: 'active' as const, allowedFeatures: [], limitedFeatures: [], blockedFeatures: [], usageLimits: [], generatedAt: '2026-01-01T00:00:00.000Z' }),
    listUsageCounters: async () => [{ counterId: 'counter-1', count: 1 }],
    listRecentAccessDecisions: async () => [{ decisionId: 'decision-1' }],
    updateAccountPlan: async () => ({ subjectId: 'user-2', planKind: 'premium' }),
    updateAccountState: async () => ({ subjectId: 'user-2', accountState: 'restricted' }),
    setInternalOverride: async () => ({ subjectId: 'user-2', internalOverride: true })
  }
};

const mockAnalyticsRuntime = {
  analytics: {
    getLatestAnalyticsSnapshot: async () => null,
    generateAnalyticsSnapshot: async () => ({ snapshotId: 'a-1' }),
    listTopSetupPatterns: async () => [],
    listTopBehaviorPatterns: async () => []
  },
  coaching: {
    getLatestCoachingSnapshot: async () => null,
    generateCoachingSnapshot: async () => ({ snapshotId: 'c-1' }),
    listTopCoachingFocusAreas: async () => [],
    listCurrentActionPlan: async () => []
  }
};

const mockNotificationRuntime = {
  repositories: {},
  management: {
    getNotificationOperationalSummaryForSubject: async () => ({ inboxUnreadCount: 0 }),
    listInbox: async () => [],
    registerOrUpdateTarget: async () => ({ targetId: 'target-1' }),
    registerOrUpdateSubscription: async () => ({ subscriptionId: 'sub-1' }),
    listSubscriptionsForSubjectDetailed: async () => ([{ subscriptionId: 'sub-1', subjectId: subject.subjectId }]),
    enableTargetForSubject: async (_kind: string, _subjectId: string, targetId: string) => { if (targetId === 'target-foreign') throw new Error('not_found'); },
    disableTargetForSubject: async (_kind: string, _subjectId: string, targetId: string) => { if (targetId === 'target-foreign') throw new Error('not_found'); },
    enableSubscription: async (subscriptionId: string) => { if (subscriptionId === 'sub-foreign') throw new Error('forbidden'); },
    disableSubscription: async (subscriptionId: string) => { if (subscriptionId === 'sub-foreign') throw new Error('forbidden'); },
    updateSubscriptionThreshold: async (subscriptionId: string) => { if (subscriptionId === 'sub-foreign') throw new Error('forbidden'); }
  },
  verification: {
    issueTargetVerificationForSubject: async () => ({ verificationId: 'v-1' }),
    consumeTargetVerificationForSubject: async () => ({ verified: true }),
    expireStaleVerifications: async () => ({ expiredCount: 1 })
  },
  delivery: {
    dispatchDue: async () => ({ dispatchedCount: 0 })
  },
  feedback: {
    getNotificationFeedbackSummary: async () => ({ summary: true }),
    listTargetsWithDegradedHealth: async () => [],
    listRecentCriticalReceipts: async () => [],
    processProviderEvent: async (_providerKind?: string, _channel?: string, _rawEvent?: unknown) => ({ accepted: true })
  }
};
const mockReasoningRuntime = {
  marketIntelligence: {
    runTiingoFixtureIngestion: async (body: { asset: string }) => ({ requestId: 'tiingo-fixture-req-1', providerId: 'tiingo_market_data', capability: 'market_price_history', responseStatus: 'success', payloadCount: 1, persistedPayloadIds: [`payload-${body.asset}`], errors: [] }),
    getScheduledIngestionPolicySnapshot: (asOfIso?: string) => ({ generatedAt: asOfIso ?? '2026-01-01T00:00:00.000Z', policies: [{ jobId: 'job-1', providerId: 'tiingo_market_data' }] }),
    runScheduledIngestionDryRun: async (jobId: string) => ({ generatedAt: '2026-01-01T00:00:00.000Z', pass: true, warnings: ['provider_api_gate:fixture_response'], run: { runId: `run-${jobId}`, providerCallMode: 'fixture_response' } }),
    getScheduledIngestionRunById: async () => null,
    listScheduledIngestionRunsByProvider: async () => ([]),
    listScheduledIngestionRunsByStatus: async () => ([]),
    getScheduledIngestionRunReplay: async () => null,
    replayScheduledIngestionRun: async (runId: string) => ({ generatedAt: '2026-01-01T00:00:00.000Z', pass: true, warnings: ['provider_api_gate:replay_captured_payload'], run: { runId: `run-replay-${runId}`, replayOfRunId: runId, providerCallMode: 'replay_captured_payload' } }),
    getScheduledIngestionOperatorInspectionSnapshot: async () => ({ runCountsByStatus: { blocked: 1, failed: 0, skipped: 0, succeeded: 1, pending: 0, running: 0 }, recentRuns: [], dryRunCount: 2, replayCount: 1, blockedLiveCount: 1, staleEvidenceWarningCount: 0, duplicateDecisionSummary: { created: 1, skipped: 0, blocked: 0 }, providerSourceReadinessSummary: { mode: 'fixture_only', providerCalls: 'blocked_live' }, providerApiGate: { activationMode: 'fixture_only', providerCallMode: 'fixture_response', liveExecution: 'blocked_until_rc_h' }, latestRunTimestamp: '2026-01-01T00:00:00.000Z', latestReplayTimestamp: '2026-01-01T00:00:00.000Z', operatorNotes: ['replay_of:run-1'], liveActivationStatus: 'blocked' }),
    getMarketEvidenceOperatorInspectionSnapshot: async () => ({ section: 'full', asset: null, summary: { providerRegistry: { liveActivationStatus: 'blocked' }, launchAssetFixtures: { scenarioCount: 3 }, officialMacro: { liveActivationStatus: 'blocked' }, newsExtractionFilings: { liveActivationStatus: 'blocked' }, cryptoRiskLiquidity: { liveActivationStatus: 'blocked' }, goldenScenarios: { scenarioCount: 2 }, cognitionCalibration: { scenarioCount: 2 }, scheduledIngestion: { liveActivationStatus: 'blocked' }, operatorNotes: ['no live providers', 'no api keys'] } }),
    listEvidencePayloadsByAsset: async () => ([]),
    listEvidencePayloadsByEvidenceClass: async () => ([]),
    listEvidencePayloadsByEvidenceType: async () => ([]),
    getProviderSourceRequestById: async () => null,
    getProviderSourceResponseByRequestId: async () => null,
    getNormalizedMarketEvidencePayloadReplayById: async () => null,
    listEvidencePayloadsByAssetWithQuality: async () => ([]),
    listEvidencePayloadsByEvidenceClassWithQuality: async () => ([]),
    getReasoningEvidenceInputByAsset: async () => ({ generatedAt: '2026-01-01T00:00:00.000Z', asset: 'xau_usd', evidenceClass: null, filterPolicy: null, items: [] }),
    getReasoningEvidenceInputByEvidenceClass: async () => ({ generatedAt: '2026-01-01T00:00:00.000Z', asset: null, evidenceClass: 'macro_calendar', filterPolicy: null, items: [] }),
    getWeightedEvidenceByAsset: async () => ({ generatedAt: '2026-01-01T00:00:00.000Z', asset: 'xau_usd', horizon: 'intraday', entries: [] }),
    getMarketCognitionByAsset: async () => ({ generatedAt: '2026-01-01T00:00:00.000Z', asset: 'xau_usd', horizon: 'intraday', scorecard: null, signals: [], narrative: '' }),
    buildSeoContentFeedSnapshot: () => ({ generatedAt: '2026-01-01T00:00:00.000Z', items: [], sitemapRecords: [] }),
    listSeoContentFeedItemsByPageKind: () => ([]),
    listSeoContentFeedItemsForAsset: () => ([]),
    listSeoContentFeedItemsForEvidenceClass: () => ([]),
    getSeoContentFeedItemBySlug: () => null
  }
};

function installMocks(): void {
  setAuthTestOverrides({ subjectResolver: async () => subject, internalToken: 'internal-token' });
  setCompositionTestOverrides({
    applicationStateRuntime: mockApplicationStateRuntime as never,
    analyticsRuntime: mockAnalyticsRuntime as never,
    notificationRuntime: mockNotificationRuntime as never,
    reasoningRuntime: mockReasoningRuntime as never
  });
}

function clearMocks(): void {
  clearAuthTestOverrides();
  setCompositionTestOverrides(null);
}



function assertCommercialRestrictionAndSliceEvidence(): void {
  const baseSnapshot = { userId: subject.userId, nowIso: '2026-01-01T00:00:00.000Z', trialStartedAt: '2026-01-01T00:00:00.000Z', activePlanCode: 'kick_off' as const, subscriptionActive: false, socialIdentifiers: [{ kind: 'x_username' as const, value: '@fixture' }], userRestrictionStatus: 'none' as const };
  const focusSnapshot = { ...baseSnapshot, activePlanCode: 'focus_plan' as const, subscriptionActive: true, trialStartedAt: null };
  const suspendedSnapshot = { ...focusSnapshot, userRestrictionStatus: 'suspended' as const };
  const bannedSnapshot = { ...focusSnapshot, userRestrictionStatus: 'banned' as const };
  assert.equal(guardRouteCommercialEntitlement({ routePath: '/api/dashboard/[asset]', method: 'GET', featureKey: 'dashboard.chart', snapshot: baseSnapshot }).allowed, true);
  assert.equal(guardRouteCommercialEntitlement({ routePath: '/api/dashboard/[asset]', method: 'GET', featureKey: 'premium.full_access', snapshot: baseSnapshot }).allowed, false);
  assert.equal(guardRouteCommercialEntitlement({ routePath: '/api/dashboard/[asset]', method: 'GET', featureKey: 'premium.full_access', snapshot: focusSnapshot }).allowed, true);
  assert.equal(guardRouteCommercialEntitlement({ routePath: '/api/journal/cases', method: 'GET', featureKey: 'journal.page', snapshot: baseSnapshot }).allowed, true);
  assert.equal(guardRouteCommercialEntitlement({ routePath: '/api/journal/influence/generate', method: 'POST', featureKey: 'premium.full_access', snapshot: baseSnapshot }).allowed, false);
  for (const routePath of ['/api/workspace/current', '/api/portfolio/watchlist', '/api/analytics/latest', '/api/coaching/latest', '/api/refresh/run', '/api/dashboard/[asset]', '/api/journal/influence/generate', '/api/notifications/summary']) {
    assert.equal(guardRouteCommercialEntitlement({ routePath, method: routePath.includes('run') || routePath.includes('generate') ? 'POST' : 'GET', featureKey: 'premium.full_access', snapshot: suspendedSnapshot }).allowed, false, `${routePath} denies suspended before payload/side effect`);
    assert.equal(guardRouteCommercialEntitlement({ routePath, method: routePath.includes('run') || routePath.includes('generate') ? 'POST' : 'GET', featureKey: 'premium.full_access', snapshot: bannedSnapshot }).allowed, false, `${routePath} denies banned before payload/side effect`);
  }
}

function assertRouteInventorySynchronized(): void {
  const inventory = buildRouteInventory();
  assert.equal(inventory.length, 146);
  const byPath = new Map(inventory.map((row) => [row.routePath, row]));
  assert.equal(byPath.size, inventory.length);
  for (const row of inventory) {
    assert.ok(row.methods.length > 0, `${row.routePath} exports no HTTP methods`);
    assert.notEqual(row.runtimeExpectation, 'partial' as RuntimeEnforcementExpectation);
    assert.notEqual(row.testCoverageStatus, 'representative_only' as RuntimeEnforcementExpectation);
    const handler = row.handlerGuardEvidence;
    const runtimeAssertions = new Set<RouteRuntimeAssertion>(row.runtimeTestEvidence.testedAssertions);
    assert.ok(row.declaredPolicyExpectation.classification, `${row.routePath} has declared policy expectation`);
    assert.ok(row.handlerGuardEvidence, `${row.routePath} has handler guard evidence`);
    assert.ok(row.runtimeTestEvidence, `${row.routePath} has runtime test evidence`);
    if (row.runtimeExpectation === 'runtime_enforced') {
      assert.ok(row.runtimeTestEvidence.evidenceLevel === 'direct_route' || row.runtimeTestEvidence.evidenceLevel === 'helper_family', `${row.routePath} runtime_enforced requires direct or helper runtime evidence`);
    }
    if (row.routePath.startsWith('/api/admin/')) {
      assert.equal(row.internalToken, 'required', `${row.routePath} admin route requires internal token`);
      assert.notEqual(row.adminPermission, 'not_required', `${row.routePath} admin route requires permission`);
      assert.equal(handler.requiresInternalRequestCall, true, `${row.routePath} admin route has internal-token handler evidence`);
      assert.ok(handler.requireFeatureAccessCall || runtimeAssertions.has('admin_permission_required'), `${row.routePath} admin route has admin permission handler/runtime evidence`);
    }
    if (row.routePath.startsWith('/api/internal/') || row.routePath.startsWith('/api/ops/')) {
      assert.equal(row.internalToken, 'required', `${row.routePath} internal/ops route requires token`);
      assert.equal(handler.requiresInternalRequestCall, true, `${row.routePath} internal/ops route has internal-token handler evidence`);
    }
    if (row.ownerBoundary === 'required') {
      assert.equal(handler.authenticatedSubjectResolverCall, true, `${row.routePath} owner route has authenticated-subject handler evidence`);
    }
    if (['focus_plan_required', 'kick_off_allowed', 'notification_preference_owner_only'].includes(row.classification)) {
      assert.ok(handler.requireFeatureAccessCall || handler.guardRouteCommercialEntitlementCall || handler.authenticatedSubjectResolverCall || handler.helperWrapperEvidence.length > 0, `${row.routePath} product route has guard/helper handler evidence`);
    }
    if (row.stepUp === 'required') {
      assert.equal(handler.stepUpChallengeReference, true, `${row.routePath} super-admin mutation has step-up handler evidence`);
      assert.equal(handler.idempotencyKeyReference, true, `${row.routePath} super-admin mutation has idempotency handler evidence`);
      assert.ok(handler.auditReference || handler.securityDecisionReference, `${row.routePath} super-admin mutation has audit/security handler evidence`);
      assert.ok(runtimeAssertions.has('step_up_required'), `${row.routePath} super-admin mutation has runtime step-up evidence`);
    }
    if (row.classification === 'blocked_live_activation' || row.runtimeExpectation === 'blocked_or_disabled') {
      assert.ok(handler.blockedLiveActivationReference || runtimeAssertions.has('blocked_live_activation'), `${row.routePath} blocked live activation has handler or runtime evidence`);
    }
    if (row.routePath.startsWith('/api/account/') && !row.routePath.startsWith('/api/account/billing')) {
      assert.equal(row.ownerBoundary, 'required', `${row.routePath} account route is owner scoped`);
    }
    if (['/api/workspace/', '/api/portfolio/', '/api/analytics/', '/api/coaching/', '/api/refresh/'].some((prefix) => row.routePath.startsWith(prefix))) {
      assert.equal(row.commercialRestrictionFirst, 'required', `${row.routePath} product route requires restriction-first guard`);
    }
  }
  assert.equal(byPath.get('/api/auth/{...nextauth}')?.classification, 'no_product_entitlement_required');
  assert.equal(byPath.get('/api/dashboard/{asset}')?.classification, 'kick_off_allowed');
  assert.equal(byPath.get('/api/journal/influence/generate')?.classification, 'focus_plan_required');
  assert.equal(byPath.get('/api/notifications/delivery/dispatch')?.classification, 'blocked_live_activation');
  assert.equal(byPath.get('/api/account/profile/social-identifiers')?.ownerBoundary, 'required');
  assert.equal(byPath.get('/api/admin/commercial/users/{userId}/restrict')?.classification, 'super_admin_required');
  assert.equal(byPath.get('/api/admin/commercial/users/{userId}/restrict')?.stepUp, 'required');

  assert.equal(byPath.get('/api/admin/commercial/users/{userId}/gift-focus-plan')?.targetUserBoundary, 'required');
  assert.equal(byPath.get('/api/admin/billing/operations/subject')?.targetUserBoundary, 'required');
  assert.equal(byPath.get('/api/admin/billing/orchestration/subject')?.targetUserBoundary, 'required');
  assert.equal(byPath.get('/api/admin/billing/provider-plan-mapping')?.targetUserBoundary, 'not_applicable');
  assert.equal(byPath.get('/api/admin/billing/provider-plan-mappings')?.targetUserBoundary, 'not_applicable');
  assert.equal(byPath.get('/api/admin/billing/policy')?.targetUserBoundary, 'not_applicable');
  const docs = readFileSync('../../docs/route-entitlement-enforcement-map.md', 'utf8');
  assert.match(docs, /RC-E generated live route count: 146/);
  assert.match(docs, /runtime_enforced/);
  assert.match(docs, /environment_verification_required/);
  assert.match(docs, /blocked_live_activation/);
}

function request(url: string, init?: RequestInit): Request {
  const headers = new Headers(init?.headers);
  if (!headers.has('x-elceo-commercial-snapshot')) {
    headers.set('x-elceo-commercial-snapshot', JSON.stringify({ userId: subject.userId, nowIso: '2026-01-01T00:00:00.000Z', trialStartedAt: null, activePlanCode: 'focus_plan', subscriptionActive: true, socialIdentifiers: [{ kind: 'x_username', value: '@fixture' }], userRestrictionStatus: 'none' }));
  }
  return new Request(url, { ...init, headers });
}

async function readJson(response: Response): Promise<{ ok: boolean; [key: string]: unknown }> {
  const payload = await response.json() as { ok: boolean; [key: string]: unknown };
  assert.equal(typeof payload.ok, 'boolean');
  return payload;
}

export async function runRouteRuntimeTests(): Promise<void> {
  assert.equal(formatAvailableScore(null), '—');
  assert.equal(formatAvailableScore(72.25), '72.3');
  const dashboardAuth=async()=>({session:{user:{id:'server-user'}},appState:{watchlist:{assets:['XAU/USD']}}}) as never;
  let dashboardReads=0,admissionSubject='';
  const deniedAdmission=(async(subject:string)=>{admissionSubject=subject;return{ok:false as const,status:429 as const,reason:'inbound_rate_limited'}}) as typeof withDashboardReadAdmission;
  const deniedHandler=createDashboardGetHandler({authenticate:dashboardAuth,readDashboard:async()=>{dashboardReads++;return null},admit:deniedAdmission});
  const spoofed=request('https://x/api/dashboard/XAU%2FUSD',{headers:{'x-forwarded-for':'203.0.113.1','x-real-ip':'203.0.113.2'}});
  assert.equal((await deniedHandler(spoofed,{params:Promise.resolve({asset:'XAU%2FUSD'})})).status,429);assert.equal(dashboardReads,0);assert.equal(admissionSubject,'server-user');
  const unavailableAdmission=(async()=>({ok:false as const,status:503 as const,reason:'inbound_control_unavailable'})) as typeof withDashboardReadAdmission;
  assert.equal((await createDashboardGetHandler({authenticate:dashboardAuth,readDashboard:async()=>{dashboardReads++;return null},admit:unavailableAdmission})(spoofed,{params:Promise.resolve({asset:'XAU%2FUSD'})})).status,503);assert.equal(dashboardReads,0);
  const allowedAdmission=(async(_subject:string,work:(signal:AbortSignal)=>Promise<unknown>)=>({ok:true as const,value:await work(new AbortController().signal)})) as typeof withDashboardReadAdmission;
  assert.equal((await createDashboardGetHandler({authenticate:dashboardAuth,readDashboard:async()=>{dashboardReads++;return null},admit:allowedAdmission})(spoofed,{params:Promise.resolve({asset:'XAU%2FUSD'})})).status,503);assert.equal(dashboardReads,1);
  let aborted=false,released=0;const lostAuthority={admit:async()=>({admitted:true as const,lease:{subjectDigest:'digest',ownerToken:'owner',expiresAt:Date.now()+10}}),renew:async()=>null,confirm:async()=>false,release:async()=>{released++;return true},heartbeatIntervalMs:()=>5};const lost=await executeAdmittedDashboardRead('server-user',signal=>new Promise<string>(resolve=>signal.addEventListener('abort',()=>{aborted=true;resolve('must-not-serve')},{once:true})),lostAuthority);assert.equal(lost.ok,false);assert.equal(aborted,true);assert.equal(released,1);

  assertRouteInventorySynchronized();
  assertCommercialRestrictionAndSliceEvidence();
  installMocks();
  blockedFeatures = new Set();
  usageIncremented = [];
  securityDecisionMode = 'allowed';
  securityCompletedCount = 0;
  securityCompletedWithResponseCount = 0;
  replayMode = 'stored';
  securityFailedCount = 0;
  securityAuditCount = 0;
  latestSecurityActionKind = null;

  setAuthTestOverrides({ subjectResolver: async () => null });
  const unauth = await workspaceCurrentRoute.GET();
  assert.equal(unauth.status, 401);
  assert.equal((await readJson(unauth)).ok, false);

  installMocks();
  assert.equal((await readJson(await workspaceCurrentRoute.GET())).ok, true);

  const refreshInvalid = await workspaceRefreshRoute.POST(request('https://x/api/workspace/refresh', { method: 'POST', body: JSON.stringify({}) }));
  assert.equal(refreshInvalid.status, 400);
  assert.equal((await readJson(refreshInvalid)).ok, false);

  const refreshMalformed = await workspaceRefreshRoute.POST(request('https://x/api/workspace/refresh', { method: 'POST', body: '{' }));
  assert.equal(refreshMalformed.status, 400);
  assert.equal((await readJson(refreshMalformed)).ok, false);

  assert.equal((await readJson(await workspaceRefreshRoute.POST(request('https://x/api/workspace/refresh', { method: 'POST', body: JSON.stringify({ triggerKind: 'manual' }), headers: { 'Idempotency-Key': 'workspace-refresh-ok' } })))).ok, true);
  assert.equal(usageIncremented.includes('workspace.refresh'), true);
  assert.equal((await readJson(await workspaceFreshnessRoute.GET())).ok, true);

  await workspaceHistoryRoute.GET(request('https://x/api/workspace/history?subjectId=attacker'));
  assert.equal(latestWorkspaceSubjectId, subject.subjectId);

  const historyInvalid = await workspaceHistoryRoute.GET(request('https://x/api/workspace/history?limit=nope'));
  assert.equal(historyInvalid.status, 400);
  assert.equal((await readJson(historyInvalid)).ok, false);
  assert.equal((await readJson(await workspaceAgendaRoute.GET())).ok, true);

  const journalCaseCreateOk = await journalCasesRoute.POST(request('https://x/api/journal/cases', { method: 'POST', headers: { 'Idempotency-Key': 'journal-create-ok' }, body: JSON.stringify({ asset: 'XAU/USD', timeframe: 'H1', title: 'draft' }) }));
  assert.equal(journalCaseCreateOk.status, 200);
  assert.equal((await readJson(journalCaseCreateOk)).ok, true);
  assert.equal(latestSecurityActionKind, 'journal_case_write');
  assert.equal(securityCompletedCount > 0, true);
  assert.equal(securityAuditCount > 0, true);
  securityDecisionMode = 'rate_limited';
  const journalCaseCreateRateLimited = await journalCasesRoute.POST(request('https://x/api/journal/cases', { method: 'POST', body: JSON.stringify({ asset: 'XAU/USD', timeframe: 'H1', title: 'draft' }) }));
  assert.deepEqual(await readJson(journalCaseCreateRateLimited), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'idempotency_conflict';
  const journalCaseCreateIdempotencyConflict = await journalCasesRoute.POST(request('https://x/api/journal/cases', { method: 'POST', headers: { 'Idempotency-Key': 'journal-create-conflict' }, body: JSON.stringify({ asset: 'XAU/USD', timeframe: 'H1', title: 'draft' }) }));
  assert.deepEqual(await readJson(journalCaseCreateIdempotencyConflict), { ok: false, error: { code: 'conflict', message: 'Idempotency conflict', details: ['idempotency_conflict'] } });
  securityDecisionMode = 'allowed';

  const journalPlanOk = await journalPlanRoute.POST(request('https://x/api/journal/cases/case-1/plan', { method: 'POST', body: JSON.stringify({ thesis: 'x' }) }), { params: Promise.resolve({ caseId: 'case-1' }) });
  assert.equal(journalPlanOk.status, 200);
  assert.equal((await readJson(journalPlanOk)).ok, true);
  assert.deepEqual(await readJson(await journalPlanRoute.POST(request('https://x/api/journal/cases/case-foreign/plan', { method: 'POST', body: JSON.stringify({ thesis: 'x' }) }), { params: Promise.resolve({ caseId: 'case-foreign' }) })), { ok: false, error: { code: 'not_found', message: 'Not found' } });
  assert.equal(latestSecurityActionKind, 'journal_case_lifecycle');
  securityDecisionMode = 'rate_limited';
  const journalPlanRateLimited = await journalPlanRoute.POST(request('https://x/api/journal/cases/case-1/plan', { method: 'POST', body: JSON.stringify({ thesis: 'x' }) }), { params: Promise.resolve({ caseId: 'case-1' }) });
  assert.deepEqual(await readJson(journalPlanRateLimited), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'allowed';
  const journalExecuteResponse = await readJson(await journalExecuteRoute.POST(request('https://x/api/journal/cases/case-1/execute', { method: 'POST', headers: { 'Idempotency-Key': 'journal-execute-ok' }, body: JSON.stringify({ openedAt: '2026-01-01T00:00:00.000Z' }) }), { params: Promise.resolve({ caseId: 'case-1' }) }));
  assert.equal(journalExecuteResponse.ok, true);
  assert.deepEqual(JSON.parse(replayResponseJson), journalExecuteResponse);
  assert.equal(latestSecurityActionKind, 'journal_case_lifecycle');
  assert.equal((await readJson(await journalAdjustRoute.POST(request('https://x/api/journal/cases/case-1/adjust', { method: 'POST', body: JSON.stringify({ notes: 'adjusted' }) }), { params: Promise.resolve({ caseId: 'case-1' }) }))).ok, true);
  assert.equal(latestSecurityActionKind, 'journal_case_lifecycle');
  assert.equal((await readJson(await journalPartialCloseRoute.POST(request('https://x/api/journal/cases/case-1/partial-close', { method: 'POST', body: JSON.stringify({ partialClosedAt: '2026-01-01T00:00:00.000Z', portionClosedPct: 50 }) }), { params: Promise.resolve({ caseId: 'case-1' }) }))).ok, true);
  assert.equal(latestSecurityActionKind, 'journal_case_lifecycle');
  assert.equal((await readJson(await journalCloseRoute.POST(request('https://x/api/journal/cases/case-1/close', { method: 'POST', body: JSON.stringify({ closedAt: '2026-01-01T00:00:00.000Z', outcome: 'win' }) }), { params: Promise.resolve({ caseId: 'case-1' }) }))).ok, true);
  assert.equal(latestSecurityActionKind, 'journal_case_lifecycle');
  assert.equal((await readJson(await journalCancelRoute.POST(request('https://x/api/journal/cases/case-1/cancel', { method: 'POST', body: JSON.stringify({ reason: 'n/a' }) }), { params: Promise.resolve({ caseId: 'case-1' }) }))).ok, true);
  assert.equal(latestSecurityActionKind, 'journal_case_lifecycle');
  assert.equal((await readJson(await journalReviewRoute.POST(request('https://x/api/journal/cases/case-1/review', { method: 'POST', body: JSON.stringify({ reviewedAt: '2026-01-01T00:00:00.000Z' }) }), { params: Promise.resolve({ caseId: 'case-1' }) }))).ok, true);
  assert.equal(latestSecurityActionKind, 'journal_case_lifecycle');
  assert.equal((await readJson(await journalReplayRoute.GET(request('https://x/api/journal/cases/case-1/replay'), { params: Promise.resolve({ caseId: 'case-1' }) }))).ok, true);
  securityDecisionMode = 'rate_limited';
  assert.deepEqual(await readJson(await journalExecuteRoute.POST(request('https://x/api/journal/cases/case-1/execute', { method: 'POST', body: JSON.stringify({ openedAt: '2026-01-01T00:00:00.000Z' }) }), { params: Promise.resolve({ caseId: 'case-1' }) })), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  assert.deepEqual(await readJson(await journalAdjustRoute.POST(request('https://x/api/journal/cases/case-1/adjust', { method: 'POST', body: JSON.stringify({ notes: 'adjusted' }) }), { params: Promise.resolve({ caseId: 'case-1' }) })), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  assert.deepEqual(await readJson(await journalReviewRoute.POST(request('https://x/api/journal/cases/case-1/review', { method: 'POST', body: JSON.stringify({ reviewedAt: '2026-01-01T00:00:00.000Z' }) }), { params: Promise.resolve({ caseId: 'case-1' }) })), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'idempotency_conflict';
  assert.deepEqual(await readJson(await journalCloseRoute.POST(request('https://x/api/journal/cases/case-1/close', { method: 'POST', headers: { 'Idempotency-Key': 'journal-close-conflict' }, body: JSON.stringify({ closedAt: '2026-01-01T00:00:00.000Z', outcome: 'win' }) }), { params: Promise.resolve({ caseId: 'case-1' }) })), { ok: false, error: { code: 'conflict', message: 'Idempotency conflict', details: ['idempotency_conflict'] } });
  securityDecisionMode = 'allowed';

  const originalPlanCase = mockApplicationStateRuntime.journal.planCase;
  mockApplicationStateRuntime.journal.planCase = async () => { throw new Error('invalid_transition'); };
  const invalidTransition = await journalPlanRoute.POST(request('https://x/api/journal/cases/case-1/plan', { method: 'POST', body: JSON.stringify({ thesis: 'x' }) }), { params: Promise.resolve({ caseId: 'case-1' }) });
  assert.equal(invalidTransition.status, 422);
  assert.equal((await readJson(invalidTransition)).ok, false);
  mockApplicationStateRuntime.journal.planCase = originalPlanCase;

  assert.equal((await readJson(await watchlistRoute.POST(request('https://x/api/portfolio/watchlist', { method: 'POST', body: JSON.stringify({ asset: 'XAU/USD', timeframe: 'H1', priority: 'high' }) })))).ok, true);
  assert.equal((await readJson(await watchlistEntryRoute.PATCH(request('https://x/api/portfolio/watchlist/entry-1', { method: 'PATCH', body: JSON.stringify({ note: 'n' }) }), { params: Promise.resolve({ entryId: 'entry-1' }) }))).ok, true);
  assert.deepEqual(await readJson(await watchlistEntryRoute.PATCH(request('https://x/api/portfolio/watchlist/entry-foreign', { method: 'PATCH', body: JSON.stringify({ note: 'n' }) }), { params: Promise.resolve({ entryId: 'entry-foreign' }) })), { ok: false, error: { code: 'not_found', message: 'Not found' } });
  assert.equal((await readJson(await watchlistStatusRoute.POST(request('https://x/api/portfolio/watchlist/entry-1/status', { method: 'POST', body: JSON.stringify({ status: 'archived' }) }), { params: Promise.resolve({ entryId: 'entry-1' }) }))).ok, true);
  assert.equal((await readJson(await watchlistThesisRoute.POST(request('https://x/api/portfolio/watchlist/entry-1/thesis-health', { method: 'POST', body: JSON.stringify({ thesisHealth: 'weakening' }) }), { params: Promise.resolve({ entryId: 'entry-1' }) }))).ok, true);
  assert.equal((await readJson(await watchlistArchiveRoute.POST(request('https://x/api/portfolio/watchlist/entry-1/archive', { method: 'POST' }), { params: Promise.resolve({ entryId: 'entry-1' }) }))).ok, true);

  assert.equal((await readJson(await positionsRoute.POST(request('https://x/api/portfolio/positions', { method: 'POST', body: JSON.stringify({ asset: 'XAU/USD', timeframe: 'H1', direction: 'long' }) })))).ok, true);
  assert.equal((await readJson(await positionOpenRoute.POST(request('https://x/api/portfolio/positions/pos-1/open', { method: 'POST', body: JSON.stringify({ openedAt: '2026-01-01T00:00:00.000Z' }) }), { params: Promise.resolve({ positionId: 'pos-1' }) }))).ok, true);
  assert.deepEqual(await readJson(await positionOpenRoute.POST(request('https://x/api/portfolio/positions/pos-foreign/open', { method: 'POST', body: JSON.stringify({ openedAt: '2026-01-01T00:00:00.000Z' }) }), { params: Promise.resolve({ positionId: 'pos-foreign' }) })), { ok: false, error: { code: 'not_found', message: 'Not found' } });
  assert.equal((await readJson(await positionCloseRoute.POST(request('https://x/api/portfolio/positions/pos-1/close', { method: 'POST', body: JSON.stringify({ closedAt: '2026-01-01T00:00:00.000Z' }) }), { params: Promise.resolve({ positionId: 'pos-1' }) }))).ok, true);

  assert.equal((await readJson(await actionsRoute.POST(request('https://x/api/portfolio/actions', { method: 'POST', body: JSON.stringify({ kind: 'review_thesis', priority: 'high', headline: 'h', rationale: 'r' }) })))).ok, true);
  assert.equal((await readJson(await actionCompleteRoute.POST(request('https://x/api/portfolio/actions/act-1/complete', { method: 'POST' }), { params: Promise.resolve({ actionId: 'act-1' }) }))).ok, true);
  assert.equal((await readJson(await actionDismissRoute.POST(request('https://x/api/portfolio/actions/act-1/dismiss', { method: 'POST' }), { params: Promise.resolve({ actionId: 'act-1' }) }))).ok, true);
  securityDecisionMode = 'rate_limited';
  assert.deepEqual(await readJson(await watchlistStatusRoute.POST(request('https://x/api/portfolio/watchlist/entry-1/status', { method: 'POST', body: JSON.stringify({ status: 'archived' }) }), { params: Promise.resolve({ entryId: 'entry-1' }) })), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'allowed';
  assert.equal((await readJson(await watchlistStatusRoute.POST(request('https://x/api/portfolio/watchlist/entry-1/status', { method: 'POST', headers: { 'Idempotency-Key': 'wl-status-ok' }, body: JSON.stringify({ status: 'archived' }) }), { params: Promise.resolve({ entryId: 'entry-1' }) }))).ok, true);
  assert.equal(latestSecurityActionKind, 'portfolio_watchlist_write');
  securityDecisionMode = 'rate_limited';
  assert.deepEqual(await readJson(await positionOpenRoute.POST(request('https://x/api/portfolio/positions/pos-1/open', { method: 'POST', body: JSON.stringify({ openedAt: '2026-01-01T00:00:00.000Z' }) }), { params: Promise.resolve({ positionId: 'pos-1' }) })), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'allowed';
  assert.equal((await readJson(await positionOpenRoute.POST(request('https://x/api/portfolio/positions/pos-1/open', { method: 'POST', headers: { 'Idempotency-Key': 'pos-open-ok' }, body: JSON.stringify({ openedAt: '2026-01-01T00:00:00.000Z' }) }), { params: Promise.resolve({ positionId: 'pos-1' }) }))).ok, true);
  assert.equal(latestSecurityActionKind, 'portfolio_position_write');
  securityDecisionMode = 'idempotency_conflict';
  assert.deepEqual(await readJson(await actionCompleteRoute.POST(request('https://x/api/portfolio/actions/act-1/complete', { method: 'POST', headers: { 'Idempotency-Key': 'act-complete-conflict' } }), { params: Promise.resolve({ actionId: 'act-1' }) })), { ok: false, error: { code: 'conflict', message: 'Idempotency conflict', details: ['idempotency_conflict'] } });
  securityDecisionMode = 'allowed';
  assert.equal((await readJson(await actionCompleteRoute.POST(request('https://x/api/portfolio/actions/act-1/complete', { method: 'POST', headers: { 'Idempotency-Key': 'act-complete-ok' } }), { params: Promise.resolve({ actionId: 'act-1' }) }))).ok, true);
  assert.equal(latestSecurityActionKind, 'portfolio_action_write');

  assert.equal(latestSecurityActionKind, 'portfolio_action_write');
  securityDecisionMode = 'rate_limited';
  assert.deepEqual(await readJson(await watchlistRoute.POST(request('https://x/api/portfolio/watchlist', { method: 'POST', body: JSON.stringify({ asset: 'XAU/USD', timeframe: 'H1', priority: 'high' }) }))), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'allowed';
  assert.equal((await readJson(await watchlistRoute.POST(request('https://x/api/portfolio/watchlist', { method: 'POST', headers: { 'Idempotency-Key': 'watchlist-ok' }, body: JSON.stringify({ asset: 'XAU/USD', timeframe: 'H1', priority: 'high' }) })))).ok, true);
  assert.equal(latestSecurityActionKind, 'portfolio_watchlist_write');
  securityDecisionMode = 'idempotency_conflict';
  assert.deepEqual(await readJson(await positionsRoute.POST(request('https://x/api/portfolio/positions', { method: 'POST', headers: { 'Idempotency-Key': 'pos-conflict' }, body: JSON.stringify({ asset: 'XAU/USD', timeframe: 'H1', direction: 'long' }) }))), { ok: false, error: { code: 'conflict', message: 'Idempotency conflict', details: ['idempotency_conflict'] } });
  securityDecisionMode = 'allowed';
  assert.equal((await readJson(await positionsRoute.POST(request('https://x/api/portfolio/positions', { method: 'POST', headers: { 'Idempotency-Key': 'pos-ok' }, body: JSON.stringify({ asset: 'XAU/USD', timeframe: 'H1', direction: 'long' }) })))).ok, true);
  assert.equal(latestSecurityActionKind, 'portfolio_position_write');
  assert.equal(securityAuditCount > 0, true);

  assert.equal((await readJson(await portfolioSnapshotGenerateRoute.POST(request('https://x/api/portfolio/snapshot/generate', { method: 'POST', headers: { 'Idempotency-Key': 'portfolio-generate-ok' } })))).ok, true);
  assert.equal(usageIncremented.includes('portfolio.snapshot.generate'), true);
  assert.equal((await readJson(await portfolioReplayRoute.GET(request('https://x/api/portfolio/replay?entityKind=position&entityId=pos-1')))).ok, true);

  assert.equal((await readJson(await analyticsLatestRoute.GET(request('https://x/api/analytics/latest')))).ok, true);
  assert.equal((await readJson(await analyticsGenerateRoute.POST(request('https://x/api/analytics/generate', { method: 'POST', headers: { 'Idempotency-Key': 'analytics-generate-ok' } })))).ok, true);
  assert.equal(usageIncremented.includes('analytics.generate'), true);
  const coachingGenerateResponse = await readJson(await coachingGenerateRoute.POST(request('https://x/api/coaching/generate', { method: 'POST', headers: { 'Idempotency-Key': 'coaching-generate-ok' } })));
  assert.equal(coachingGenerateResponse.ok, true);
  assert.deepEqual(JSON.parse(replayResponseJson), coachingGenerateResponse);
  assert.equal(usageIncremented.includes('coaching.generate'), true);
  assert.equal((await readJson(await analyticsTopSetupsRoute.GET(request('https://x/api/analytics/top-setups')))).ok, true);
  assert.equal((await readJson(await analyticsTopBehaviorsRoute.GET(request('https://x/api/analytics/top-behaviors')))).ok, true);
  assert.equal((await readJson(await coachingFocusRoute.GET(request('https://x/api/coaching/focus')))).ok, true);
  assert.equal((await readJson(await coachingActionPlanRoute.GET(request('https://x/api/coaching/action-plan')))).ok, true);

  assert.equal((await readJson(await notificationsSummaryRoute.GET(request('https://x/api/notifications/summary')))).ok, true);
  assert.equal((await readJson(await notificationsInboxRoute.GET(request('https://x/api/notifications/inbox?limit=5')))).ok, true);
  securityDecisionMode = 'rate_limited';
  assert.deepEqual(await readJson(await notificationsTargetsRoute.POST(request('https://x/api/notifications/targets', { method: 'POST', body: JSON.stringify({ channel: 'email', value: 'a@b.com' }) }))), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'idempotency_conflict';
  assert.deepEqual(await readJson(await notificationsTargetsRoute.POST(request('https://x/api/notifications/targets', { method: 'POST', headers: { 'Idempotency-Key': 'notification-target-conflict' }, body: JSON.stringify({ channel: 'email', value: 'a@b.com' }) }))), { ok: false, error: { code: 'conflict', message: 'Idempotency conflict', details: ['idempotency_conflict'] } });
  securityDecisionMode = 'allowed';
  const notificationTargetResponse = await readJson(await notificationsTargetsRoute.POST(request('https://x/api/notifications/targets', { method: 'POST', headers: { 'Idempotency-Key': 'notification-target-ok' }, body: JSON.stringify({ channel: 'email', value: 'a@b.com' }) })));
  assert.equal(notificationTargetResponse.ok, true);
  assert.deepEqual(JSON.parse(replayResponseJson), notificationTargetResponse);
  assert.equal(latestSecurityActionKind, 'notification_target_write');
  securityDecisionMode = 'rate_limited';
  assert.deepEqual(await readJson(await notificationsTargetEnableRoute.POST(request('https://x/api/notifications/targets/target-1/enable', { method: 'POST' }), { params: Promise.resolve({ targetId: 'target-1' }) })), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'allowed';
  assert.equal(latestSecurityActionKind, 'notification_target_write');
  securityDecisionMode = 'rate_limited';
  assert.deepEqual(await readJson(await notificationsTargetDisableRoute.POST(request('https://x/api/notifications/targets/target-1/disable', { method: 'POST' }), { params: Promise.resolve({ targetId: 'target-1' }) })), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'allowed';
  assert.equal(latestSecurityActionKind, 'notification_target_write');
  securityDecisionMode = 'rate_limited';
  assert.deepEqual(await readJson(await notificationsSubscriptionsRoute.POST(request('https://x/api/notifications/subscriptions', { method: 'POST', body: JSON.stringify({ channel: 'email', minimumMaterialityScore: 0.7 }) }))), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'idempotency_conflict';
  assert.deepEqual(await readJson(await notificationsSubscriptionsRoute.POST(request('https://x/api/notifications/subscriptions', { method: 'POST', headers: { 'Idempotency-Key': 'notification-subscription-conflict' }, body: JSON.stringify({ channel: 'email', minimumMaterialityScore: 0.7 }) }))), { ok: false, error: { code: 'conflict', message: 'Idempotency conflict', details: ['idempotency_conflict'] } });
  securityDecisionMode = 'allowed';
  assert.equal((await readJson(await notificationsSubscriptionsRoute.POST(request('https://x/api/notifications/subscriptions', { method: 'POST', headers: { 'Idempotency-Key': 'notification-subscription-ok' }, body: JSON.stringify({ channel: 'email', minimumMaterialityScore: 0.7 }) })))).ok, true);
  assert.equal(latestSecurityActionKind, 'notification_subscription_write');
  securityDecisionMode = 'rate_limited';
  assert.deepEqual(await readJson(await notificationsSubscriptionRoute.PATCH(request('https://x/api/notifications/subscriptions/sub-1', { method: 'PATCH', body: JSON.stringify({ isEnabled: false }) }), { params: Promise.resolve({ subscriptionId: 'sub-1' }) })), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'allowed';
  assert.deepEqual(await readJson(await notificationsSubscriptionRoute.PATCH(request('https://x/api/notifications/subscriptions/sub-foreign', { method: 'PATCH', body: JSON.stringify({ isEnabled: false }) }), { params: Promise.resolve({ subscriptionId: 'sub-foreign' }) })), { ok: false, error: { code: 'forbidden', message: 'Owner scope denied', details: ['code:owner_scope_denied'] } });
  assert.equal(latestSecurityActionKind, 'notification_subscription_write');
  const notificationVerificationIssueOk = await notificationsVerificationIssueRoute.POST(request('https://x/api/notifications/verification/issue', { method: 'POST', headers: { 'Idempotency-Key': 'notification-issue-ok' }, body: JSON.stringify({ targetId: 'target-1' }) }));
  assert.equal(notificationVerificationIssueOk.status, 200);
  assert.equal((await readJson(notificationVerificationIssueOk)).ok, true);
  assert.equal(latestSecurityActionKind, 'notification_verification_issue');
  securityDecisionMode = 'rate_limited';
  const notificationVerificationIssueRateLimited = await notificationsVerificationIssueRoute.POST(request('https://x/api/notifications/verification/issue', { method: 'POST', body: JSON.stringify({ targetId: 'target-1' }) }));
  assert.deepEqual(await readJson(notificationVerificationIssueRateLimited), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'idempotency_conflict';
  const notificationVerificationIssueIdempotencyConflict = await notificationsVerificationIssueRoute.POST(request('https://x/api/notifications/verification/issue', { method: 'POST', headers: { 'Idempotency-Key': 'notification-issue-conflict' }, body: JSON.stringify({ targetId: 'target-1' }) }));
  assert.deepEqual(await readJson(notificationVerificationIssueIdempotencyConflict), { ok: false, error: { code: 'conflict', message: 'Idempotency conflict', details: ['idempotency_conflict'] } });
  securityDecisionMode = 'allowed';

  const notificationVerificationConsumeOk = await notificationsVerificationConsumeRoute.POST(request('https://x/api/notifications/verification/consume', { method: 'POST', body: JSON.stringify({ targetId: 'target-1', token: 'abc' }) }));
  assert.equal(notificationVerificationConsumeOk.status, 200);
  assert.equal((await readJson(notificationVerificationConsumeOk)).ok, true);
  assert.equal(latestSecurityActionKind, 'notification_verification_consume');
  securityDecisionMode = 'rate_limited';
  const notificationVerificationConsumeRateLimited = await notificationsVerificationConsumeRoute.POST(request('https://x/api/notifications/verification/consume', { method: 'POST', body: JSON.stringify({ targetId: 'target-1', token: 'abc' }) }));
  assert.deepEqual(await readJson(notificationVerificationConsumeRateLimited), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'allowed';
  assert.equal((await readJson(await notificationsHealthRoute.GET())).ok, true);
  assert.equal(securityAuditCount > 0, true);

  const blockedDispatch = await notificationsDispatchRoute.POST(request('https://x/api/notifications/delivery/dispatch', { method: 'POST' }));
  assert.equal(blockedDispatch.status, 403);
  assert.equal((await readJson(blockedDispatch)).ok, false);
  const dispatchAllowed = await notificationsDispatchRoute.POST(request('https://x/api/notifications/delivery/dispatch', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' } }));
  assert.deepEqual(await readJson(dispatchAllowed), { ok: true, data: { report: await mockNotificationRuntime.delivery.dispatchDue() } });
  securityDecisionMode = 'rate_limited';
  const dispatchRateLimited = await notificationsDispatchRoute.POST(request('https://x/api/notifications/delivery/dispatch', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' } }));
  assert.deepEqual(await readJson(dispatchRateLimited), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'idempotency_conflict';
  const dispatchConflict = await notificationsDispatchRoute.POST(request('https://x/api/notifications/delivery/dispatch', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'idem-dispatch' } }));
  assert.deepEqual(await readJson(dispatchConflict), { ok: false, error: { code: 'conflict', message: 'Idempotency conflict', details: ['idempotency_conflict'] } });
  securityDecisionMode = 'allowed';

  assert.equal((await readJson(await refreshLatestRoute.GET())).ok, true);
  assert.equal((await readJson(await refreshHistoryRoute.GET(request('https://x/api/refresh/history?limit=5')))).ok, true);
  assert.equal((await readJson(await refreshFreshnessRoute.GET())).ok, true);
  const refreshRunResponse = await readJson(await refreshRunRoute.POST(request('https://x/api/refresh/run', { method: 'POST', body: JSON.stringify({ triggerKind: 'manual' }), headers: { 'Idempotency-Key': 'refresh-run-ok' } })));
  assert.equal(refreshRunResponse.ok, true);
  assert.deepEqual(JSON.parse(replayResponseJson), refreshRunResponse);
  const journalInfluenceOk = await journalInfluenceGenerateRoute.POST(request('https://x/api/journal/influence/generate', { method: 'POST', headers: { 'Idempotency-Key': 'journal-influence-ok' } }));
  assert.equal((await readJson(journalInfluenceOk)).ok, true);
  assert.equal(latestSecurityActionKind, 'journal_influence_generate');
  assert.equal(usageIncremented.includes('refresh.run'), true);

  securityDecisionMode = 'rate_limited';
  assert.deepEqual(await readJson(await workspaceRefreshRoute.POST(request('https://x/api/workspace/refresh', { method: 'POST', body: JSON.stringify({ triggerKind: 'manual' }) }))), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  assert.deepEqual(await readJson(await analyticsGenerateRoute.POST(request('https://x/api/analytics/generate', { method: 'POST' }))), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  assert.deepEqual(await readJson(await coachingGenerateRoute.POST(request('https://x/api/coaching/generate', { method: 'POST' }))), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  assert.deepEqual(await readJson(await portfolioSnapshotGenerateRoute.POST(request('https://x/api/portfolio/snapshot/generate', { method: 'POST' }))), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  assert.deepEqual(await readJson(await refreshRunRoute.POST(request('https://x/api/refresh/run', { method: 'POST', body: JSON.stringify({ triggerKind: 'manual' }) }))), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  assert.deepEqual(await readJson(await journalInfluenceGenerateRoute.POST(request('https://x/api/journal/influence/generate', { method: 'POST' }))), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'idempotency_conflict';
  assert.deepEqual(await readJson(await workspaceRefreshRoute.POST(request('https://x/api/workspace/refresh', { method: 'POST', headers: { 'Idempotency-Key': 'workspace-conflict' }, body: JSON.stringify({ triggerKind: 'manual' }) }))), { ok: false, error: { code: 'conflict', message: 'Idempotency conflict', details: ['idempotency_conflict'] } });
  assert.deepEqual(await readJson(await analyticsGenerateRoute.POST(request('https://x/api/analytics/generate', { method: 'POST', headers: { 'Idempotency-Key': 'analytics-conflict' } }))), { ok: false, error: { code: 'conflict', message: 'Idempotency conflict', details: ['idempotency_conflict'] } });
  securityDecisionMode = 'allowed';

  const accountEntitlements = await accountEntitlementsRoute.GET();
  assert.equal(accountEntitlements.status, 200);
  assert.equal((await readJson(accountEntitlements)).ok, true);
  assert.equal((await readJson(await accountUsageRoute.GET())).ok, true);
  assert.equal((await readJson(await accountAccessDecisionsRoute.GET(request('https://x/api/account/access-decisions?limit=5')))).ok, true);
  assert.equal((await readJson(await accountAccessCheckRoute.POST(request('https://x/api/account/access-check', { method: 'POST', body: JSON.stringify({ feature: 'workspace.refresh' }) })))).ok, true);
  const accountAccessCrossSubjectProbe = await readJson(await accountAccessCheckRoute.POST(request('https://x/api/account/access-check', { method: 'POST', body: JSON.stringify({ feature: 'workspace.refresh', subjectId: 'user-2' }) })));
  assert.equal(accountAccessCrossSubjectProbe.ok, true);
  assert.equal((((accountAccessCrossSubjectProbe.data as { decision?: { subjectId?: string } }).decision?.subjectId) ?? null), 'user-1');


  setAuthTestOverrides({ subjectResolver: async () => null });
  const socialIdentifiersUnauthorized = await accountProfileSocialIdentifiersRoute.GET();
  assert.equal(socialIdentifiersUnauthorized.status, 401);
  installMocks();
  assert.equal((await readJson(await accountProfileSocialIdentifiersRoute.PATCH(request('https://x/api/account/profile/social-identifiers', { method: 'PATCH', body: JSON.stringify({ linkedinAddress: 'https://linkedin.com/in/elceo' }) })))).ok, true);
  const socialGetLinkedIn = await readJson(await accountProfileSocialIdentifiersRoute.GET());
  assert.equal(socialGetLinkedIn.ok, true);
  assert.equal((((socialGetLinkedIn.data as { socialIdentifiers?: Array<{ kind?: string }> }).socialIdentifiers?.[0]?.kind) ?? null), 'linkedin_address');
  const socialTelegram = await readJson(await accountProfileSocialIdentifiersRoute.PATCH(request('https://x/api/account/profile/social-identifiers', { method: 'PATCH', body: JSON.stringify({ telegramId: 'elceo_tg', userId: 'user-2' }) })));
  assert.equal(socialTelegram.ok, true);
  assert.equal((((socialTelegram.data as { userId?: string }).userId) ?? null), 'user-1');
  const socialX = await readJson(await accountProfileSocialIdentifiersRoute.PATCH(request('https://x/api/account/profile/social-identifiers', { method: 'PATCH', body: JSON.stringify({ xUsername: '@elceox' }) })));
  assert.equal(socialX.ok, true);
  assert.equal((((socialX.data as { socialIdentifiers?: Array<{ kind?: string }> }).socialIdentifiers?.[0]?.kind) ?? null), 'x_username');
  assert.equal((JSON.stringify(socialX).toLowerCase().includes('session')), false);
  const socialInvalid = await accountProfileSocialIdentifiersRoute.PATCH(request('https://x/api/account/profile/social-identifiers', { method: 'PATCH', body: JSON.stringify({ xUsername: '<script>alert(1)</script>' }) }));
  assert.equal(socialInvalid.status, 400);
  assert.equal((await readJson(socialInvalid)).ok, false);

  setAuthTestOverrides({ subjectResolver: async () => null });
  const accountBillingUnauthorized = await accountBillingRoute.GET();
  assert.equal(accountBillingUnauthorized.status, 401);
  assert.deepEqual(await readJson(accountBillingUnauthorized), { ok: false, error: { code: 'unauthorized', message: 'Unauthorized' } });
  installMocks();
  assert.deepEqual(await readJson(await accountBillingRoute.GET()), { ok: true, data: { snapshot: await mockApplicationStateRuntime.billingLifecycle.getBillingLifecycleSnapshot('user', 'user-1') } });
  setAuthTestOverrides({ subjectResolver: async () => null });
  assert.deepEqual(await readJson(await accountBillingPolicyRoute.GET()), { ok: false, error: { code: 'unauthorized', message: 'Unauthorized' } });
  installMocks();
  assert.deepEqual(await readJson(await accountBillingPolicyRoute.GET()), { ok: true, data: { snapshot: await mockApplicationStateRuntime.billingPolicy.getBillingPolicySnapshot('user', 'user-1') } });
  setAuthTestOverrides({ subjectResolver: async () => null });
  assert.deepEqual(await readJson(await accountBillingPolicyTransitionsRoute.GET()), { ok: false, error: { code: 'unauthorized', message: 'Unauthorized' } });
  installMocks();
  assert.deepEqual(await readJson(await accountBillingPolicyTransitionsRoute.GET()), { ok: true, data: { transitions: await mockApplicationStateRuntime.billingPolicy.listRecentBillingPolicyTransitions('user', 'user-1') } });
  setAuthTestOverrides({ subjectResolver: async () => null });
  const runsUnauthorized = await accountBillingReconciliationRunsRoute.GET();
  assert.equal(runsUnauthorized.status, 401);
  assert.deepEqual(await readJson(runsUnauthorized), { ok: false, error: { code: 'unauthorized', message: 'Unauthorized' } });
  installMocks();
  assert.deepEqual(await readJson(await accountBillingReconciliationRunsRoute.GET()), { ok: true, data: { runs: await mockApplicationStateRuntime.billingLifecycle.listRecentBillingReconciliationRuns('user', 'user-1') } });

  const adminBillingUnauthorized = await adminBillingTrialRoute.POST(request('https://x/api/admin/billing/trial', { method: 'POST', body: JSON.stringify({ subjectId: 'user-2', planKind: 'premium', trialEndsAt: '2026-01-01T00:00:00.000Z' }) }));
  assert.equal(adminBillingUnauthorized.status, 403);
  assert.equal((await readJson(adminBillingUnauthorized)).ok, false);
  assert.equal((await readJson(await adminBillingTrialRoute.POST(request('https://x/api/admin/billing/trial', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2', planKind: 'premium', trialEndsAt: '2026-01-01T00:00:00.000Z' }) })))).ok, true);
  assert.equal((await readJson(await adminBillingActivateRoute.POST(request('https://x/api/admin/billing/activate', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2', planKind: 'premium', interval: 'monthly', currentPeriodStart: '2026-01-01T00:00:00.000Z', currentPeriodEnd: '2026-02-01T00:00:00.000Z' }) })))).ok, true);
  const adminBillingRenewResponse = await readJson(await adminBillingRenewRoute.POST(request('https://x/api/admin/billing/renew', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'admin-renew-ok' }, body: JSON.stringify({ subjectId: 'user-2', nextPeriodStart: '2026-02-01T00:00:00.000Z', nextPeriodEnd: '2026-03-01T00:00:00.000Z' }) })));
  assert.equal(adminBillingRenewResponse.ok, true);
  assert.deepEqual(JSON.parse(replayResponseJson), adminBillingRenewResponse);
  assert.equal((await readJson(await adminBillingChangePlanRoute.POST(request('https://x/api/admin/billing/change-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2', nextPlanKind: 'premium', interval: 'monthly', effectiveAt: '2026-02-01T00:00:00.000Z', reason: 'upgrade' }) })))).ok, true);
  assert.equal((await readJson(await adminBillingPastDueRoute.POST(request('https://x/api/admin/billing/past-due', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2', occurredAt: '2026-02-01T00:00:00.000Z' }) })))).ok, true);
  assert.equal((await readJson(await adminBillingCancelAtPeriodEndRoute.POST(request('https://x/api/admin/billing/cancel-at-period-end', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2', occurredAt: '2026-02-01T00:00:00.000Z' }) })))).ok, true);
  assert.equal((await readJson(await adminBillingExpireRoute.POST(request('https://x/api/admin/billing/expire', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2', occurredAt: '2026-02-01T00:00:00.000Z' }) })))).ok, true);
  assert.equal((await readJson(await adminBillingPauseRoute.POST(request('https://x/api/admin/billing/pause', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2', occurredAt: '2026-02-01T00:00:00.000Z' }) })))).ok, true);
  assert.equal((await readJson(await adminBillingResumeRoute.POST(request('https://x/api/admin/billing/resume', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2', occurredAt: '2026-02-01T00:00:00.000Z' }) })))).ok, true);
  securityDecisionMode = 'rate_limited';
  assert.deepEqual(await readJson(await adminBillingTrialRoute.POST(request('https://x/api/admin/billing/trial', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2', planKind: 'premium', trialEndsAt: '2026-01-01T00:00:00.000Z' }) }))), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'idempotency_conflict';
  assert.deepEqual(await readJson(await adminBillingTrialRoute.POST(request('https://x/api/admin/billing/trial', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'trial-conflict' }, body: JSON.stringify({ subjectId: 'user-2', planKind: 'premium', trialEndsAt: '2026-01-01T00:00:00.000Z' }) }))), { ok: false, error: { code: 'conflict', message: 'Idempotency conflict', details: ['idempotency_conflict'] } });
  securityDecisionMode = 'allowed';

  const adminEntitlementPlanResponse = await readJson(await adminEntitlementPlanRoute.POST(request('https://x/api/admin/entitlements/plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'ent-plan-ok' }, body: JSON.stringify({ subjectId: 'user-2', planKind: 'premium' }) })));
  assert.equal(adminEntitlementPlanResponse.ok, true);
  assert.deepEqual(JSON.parse(replayResponseJson), adminEntitlementPlanResponse);
  assert.equal((await readJson(await adminEntitlementStateRoute.POST(request('https://x/api/admin/entitlements/state', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'ent-state-ok' }, body: JSON.stringify({ subjectId: 'user-2', accountState: 'restricted' }) })))).ok, true);
  assert.equal((await readJson(await adminEntitlementOverrideRoute.POST(request('https://x/api/admin/entitlements/override', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'ent-override-ok' }, body: JSON.stringify({ subjectId: 'user-2', internalOverride: true }) })))).ok, true);
  assert.equal(securityCompletedCount > 0, true);
  assert.equal(securityAuditCount > 0, true);
  securityDecisionMode = 'rate_limited';
  assert.deepEqual(await readJson(await adminEntitlementPlanRoute.POST(request('https://x/api/admin/entitlements/plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2', planKind: 'premium' }) }))), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  assert.deepEqual(await readJson(await adminEntitlementStateRoute.POST(request('https://x/api/admin/entitlements/state', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2', accountState: 'restricted' }) }))), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  assert.deepEqual(await readJson(await adminEntitlementOverrideRoute.POST(request('https://x/api/admin/entitlements/override', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2', internalOverride: true }) }))), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'idempotency_conflict';
  assert.deepEqual(await readJson(await adminEntitlementPlanRoute.POST(request('https://x/api/admin/entitlements/plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'ent-plan-conflict' }, body: JSON.stringify({ subjectId: 'user-2', planKind: 'premium' }) }))), { ok: false, error: { code: 'conflict', message: 'Idempotency conflict', details: ['idempotency_conflict'] } });
  securityDecisionMode = 'allowed';

  blockedFeatures = new Set(['workspace.refresh', 'analytics.generate', 'coaching.generate', 'portfolio.snapshot.generate', 'refresh.run', 'admin.read', 'admin.ops']);
  const blockedWorkspace = await workspaceRefreshRoute.POST(request('https://x/api/workspace/refresh', { method: 'POST', body: JSON.stringify({ triggerKind: 'manual' }) }));
  assert.equal(blockedWorkspace.status, 403);
  assert.equal((await readJson(blockedWorkspace)).ok, false);
  const blockedAdmin = await adminSystemSummaryRoute.GET(request('https://x/api/admin/system-summary', { headers: { 'x-elceo-internal-token': 'internal-token' } }));
  assert.equal(blockedAdmin.status, 403);
  const blockedOps = await opsExpireRoute.POST(request('https://x/api/ops/notifications/expire-verifications', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' } }));
  assert.equal(blockedOps.status, 403);
  blockedFeatures = new Set();

  const expireAllowed = await opsExpireRoute.POST(request('https://x/api/ops/notifications/expire-verifications', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' } }));
  assert.deepEqual(await readJson(expireAllowed), { ok: true, data: { report: await mockNotificationRuntime.verification.expireStaleVerifications() } });
  securityDecisionMode = 'rate_limited';
  const expireRateLimited = await opsExpireRoute.POST(request('https://x/api/ops/notifications/expire-verifications', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' } }));
  assert.deepEqual(await readJson(expireRateLimited), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'allowed';
  const feedbackAllowed = await opsFeedbackRoute.POST(request('https://x/api/ops/notifications/process-feedback', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ providerKind: 'memory', channel: 'email', rawEvent: {} }) }));
  assert.deepEqual(await readJson(feedbackAllowed), { ok: true, data: { report: await mockNotificationRuntime.feedback.processProviderEvent('memory', 'email', {}) } });
  securityDecisionMode = 'rate_limited';
  const feedbackRateLimited = await opsFeedbackRoute.POST(request('https://x/api/ops/notifications/process-feedback', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ providerKind: 'memory', channel: 'email', rawEvent: {} }) }));
  assert.deepEqual(await readJson(feedbackRateLimited), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'allowed';

  const adminUnauthorized = await adminSystemSummaryRoute.GET(request('https://x/api/admin/system-summary'));
  assert.equal(adminUnauthorized.status, 403);
  assert.equal((await readJson(adminUnauthorized)).ok, false);
  assert.equal((await readJson(await adminSystemSummaryRoute.GET(request('https://x/api/admin/system-summary', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.equal((await readJson(await adminFreshnessRoute.GET(request('https://x/api/admin/freshness', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.equal((await readJson(await adminOpsRoute.GET(request('https://x/api/admin/ops', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.equal((await readJson(await adminProvidersRoute.GET(request('https://x/api/admin/providers', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.equal((await readJson(await adminAuditRoute.GET(request('https://x/api/admin/audit?limit=5', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);

  const stepUpChallengeNoToken = await adminStepUpChallengeRoute.POST(request('https://x/api/admin/security/step-up/challenge', { method: 'POST', body: JSON.stringify({ providerKind: 'fixture_test_only', actionKind: 'focus_plan_gift', routeScope: '/api/admin/commercial/users/[userId]/gift-focus-plan', targetUserId: 'user-5' }) }));
  assert.equal(stepUpChallengeNoToken.status, 403);
  const stepUpChallengeOk = await adminStepUpChallengeRoute.POST(request('https://x/api/admin/security/step-up/challenge', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ providerKind: 'fixture_test_only', actionKind: 'focus_plan_gift', routeScope: '/api/admin/commercial/users/[userId]/gift-focus-plan', targetUserId: 'user-5' }) }));
  assert.equal(stepUpChallengeOk.status, 200);
  const stepUpChallengeOkJson = await readJson(stepUpChallengeOk);
  assert.equal(stepUpChallengeOkJson.ok, true);
  assertNoSensitiveLeak(stepUpChallengeOkJson);


  const stepUpChallengeWrongRouteScope = await adminStepUpChallengeRoute.POST(request('https://x/api/admin/security/step-up/challenge', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ providerKind: 'fixture_test_only', actionKind: 'focus_plan_gift', routeScope: '/wrong', targetUserId: 'user-5' }) }));
  assert.equal(stepUpChallengeWrongRouteScope.status, 400);
  const stepUpChallengeNonStringRouteScope = await adminStepUpChallengeRoute.POST(request('https://x/api/admin/security/step-up/challenge', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ providerKind: 'fixture_test_only', actionKind: 'focus_plan_gift', routeScope: 123, targetUserId: 'user-5' }) }));
  assert.equal(stepUpChallengeNonStringRouteScope.status, 400);

  const stepUpVerifyNoToken = await adminStepUpVerifyRoute.POST(request('https://x/api/admin/security/step-up/verify', { method: 'POST', body: JSON.stringify({ challengeId: 'x', providerKind: 'fixture_test_only', proof: 'fixture-pass' }) }));
  assert.equal(stepUpVerifyNoToken.status, 403);
  const challengeId = (stepUpChallengeOkJson.data as { challengeId: string }).challengeId;
  const stepUpVerifyBad = await adminStepUpVerifyRoute.POST(request('https://x/api/admin/security/step-up/verify', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ challengeId, providerKind: 'fixture_test_only', proof: 'wrong' }) }));
  assert.equal(stepUpVerifyBad.status, 200);
  assert.equal(((await readJson(stepUpVerifyBad)).data as { verified: boolean }).verified, false);
  const stepUpVerifyOk = await adminStepUpVerifyRoute.POST(request('https://x/api/admin/security/step-up/verify', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ challengeId, providerKind: 'fixture_test_only', proof: 'fixture-pass' }) }));
  assert.equal(stepUpVerifyOk.status, 200);
  assert.equal(((await readJson(stepUpVerifyOk)).data as { verified: boolean }).verified, true);
  const stepUpVerifyReplay = await adminStepUpVerifyRoute.POST(request('https://x/api/admin/security/step-up/verify', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ challengeId, providerKind: 'fixture_test_only', proof: 'fixture-pass' }) }));
  assert.equal(((await readJson(stepUpVerifyReplay)).data as { status: string }).status, 'replayed');

  const stepUpReadinessNoToken = await adminStepUpReadinessRoute.GET(request('https://x/api/admin/security/step-up/readiness'));
  assert.equal(stepUpReadinessNoToken.status, 403);
  const stepUpReadinessOk = await adminStepUpReadinessRoute.GET(request('https://x/api/admin/security/step-up/readiness', { headers: { 'x-elceo-internal-token': 'internal-token' } }));
  const stepUpReadinessJson = await readJson(stepUpReadinessOk);
  assert.equal(stepUpReadinessOk.status, 200);
  assert.equal(JSON.stringify(stepUpReadinessJson).includes('provider_pending'), true);
  assertNoSensitiveLeak(stepUpReadinessJson);

  setStepUpPersistenceFailureMode('challenge');
  const stepUpChallengePersistenceFailure = await adminStepUpChallengeRoute.POST(request('https://x/api/admin/security/step-up/challenge', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ providerKind: 'fixture_test_only', actionKind: 'focus_plan_gift', targetUserId: 'user-5' }) }));
  assert.equal(stepUpChallengePersistenceFailure.status, 503);
  assert.equal(JSON.stringify(await readJson(stepUpChallengePersistenceFailure)).includes('step_up_persistence_unavailable'), true);
  setStepUpPersistenceFailureMode('verify');
  const stepUpVerifyPersistenceFailure = await adminStepUpVerifyRoute.POST(request('https://x/api/admin/security/step-up/verify', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ challengeId, providerKind: 'fixture_test_only', proof: 'fixture-pass' }) }));
  assert.equal(stepUpVerifyPersistenceFailure.status, 503);
  setStepUpPersistenceFailureMode('readiness');
  const stepUpReadinessPersistenceFailure = await adminStepUpReadinessRoute.GET(request('https://x/api/admin/security/step-up/readiness', { headers: { 'x-elceo-internal-token': 'internal-token' } }));
  assert.equal(stepUpReadinessPersistenceFailure.status, 200);
  assert.equal(((await readJson(stepUpReadinessPersistenceFailure)).data as { persistence: { persistenceStatus: string } }).persistence.persistenceStatus, 'unavailable');
  setStepUpPersistenceFailureMode('none');


  resetCommercialMutationCounts();
  const p4GiftNoToken = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-5/gift-focus-plan', { method: 'POST', body: JSON.stringify({ duration: 'two_weeks' }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4GiftNoToken.status, 403);
  assert.equal((await readJson(p4GiftNoToken)).ok, false);
  setStepUpPersistenceFailureMode('consume');
  const p4GiftPersistenceFailure = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-5/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ duration: 'two_weeks', stepUpChallengeId: challengeId }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4GiftPersistenceFailure.status, 503);
  assert.equal(commercialMutationCounts.gift, 0);
  assert.equal(JSON.stringify(await readJson(p4GiftPersistenceFailure)).includes('step_up_persistence_unavailable'), true);
  const p4RetractPersistenceFailure = await adminCommercialRetractFocusGiftRoute.POST(request('https://x/api/admin/commercial/users/user-5/retract-focus-gift', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ giftRecordId: 'gift-user-5', stepUpChallengeId: challengeId }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4RetractPersistenceFailure.status, 503);
  assert.equal(commercialMutationCounts.retract, 0);
  const p4RestrictPersistenceFailure = await adminCommercialRestrictUserRoute.POST(request('https://x/api/admin/commercial/users/user-5/restrict', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ restrictionKind: 'banned', stepUpChallengeId: challengeId }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4RestrictPersistenceFailure.status, 503);
  assert.equal(commercialMutationCounts.restrict, 0);
  assert.equal(JSON.stringify(await readJson(p4RestrictPersistenceFailure)).includes('sql'), false);
  setStepUpPersistenceFailureMode('none');

  resetCommercialMutationCounts();
  const retryChallenge = await adminStepUpChallengeRoute.POST(request('https://x/api/admin/security/step-up/challenge', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ providerKind: 'fixture_test_only', actionKind: 'focus_plan_gift', targetUserId: 'user-retry' }) }));
  const retryChallengeId = ((await readJson(retryChallenge)).data as { challengeId: string }).challengeId;
  await adminStepUpVerifyRoute.POST(request('https://x/api/admin/security/step-up/verify', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ challengeId: retryChallengeId, providerKind: 'fixture_test_only', proof: 'fixture-pass' }) }));
  setStepUpPersistenceFailureMode('consume');
  const retryFail = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-retry/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'idempotency-key': 'retry-key' }, body: JSON.stringify({ duration: 'two_weeks', stepUpChallengeId: retryChallengeId }) }), { params: Promise.resolve({ userId: 'user-retry' }) });
  assert.equal(retryFail.status, 503);
  setStepUpPersistenceFailureMode('none');
  const retrySuccess = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-retry/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'idempotency-key': 'retry-key' }, body: JSON.stringify({ duration: 'two_weeks', stepUpChallengeId: retryChallengeId }) }), { params: Promise.resolve({ userId: 'user-retry' }) });
  assert.equal(retrySuccess.status, 200);
  assert.equal(commercialMutationCounts.gift, 1);
  resetCommercialMutationCounts();

  const p4GiftNoStepUp = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-5/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ duration: 'two_weeks' }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4GiftNoStepUp.status, 403);
  const p4GiftNoStepUpJson = await readJson(p4GiftNoStepUp);
  assert.equal(p4GiftNoStepUpJson.ok, false);
  assert.equal(JSON.stringify(p4GiftNoStepUpJson).includes('step_up_required'), true);


  const p4GiftForgedOnly = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-5/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ duration: 'two_weeks', stepUpVerification: { status: 'verified', verifiedAt: new Date().toISOString(), challengeId: null }, proof: 'fixture-pass' }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4GiftForgedOnly.status, 403);
  assertNoSensitiveLeak(await readJson(p4GiftForgedOnly));

  const p4GiftUnknownChallenge = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-5/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'commercial-denied-replay' }, body: JSON.stringify({ duration: 'two_weeks', stepUpChallengeId: 'stepup_unknown', proof: 'fixture-pass' }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4GiftUnknownChallenge.status, 403);
  const p4GiftUnknownJson = await readJson(p4GiftUnknownChallenge);
  assert.deepEqual(p4GiftUnknownJson, { ok: false, error: { code: 'forbidden', message: 'Step-up verification failed', details: ['step_up_verification_failed'] } });
  const p4GiftUnknownReplay = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-5/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'commercial-denied-replay' }, body: JSON.stringify({ duration: 'two_weeks', stepUpChallengeId: 'stepup_unknown', proof: 'fixture-pass' }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.deepEqual(await readJson(p4GiftUnknownReplay), p4GiftUnknownJson);

  const p4GiftInvalidDuration = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-5/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ duration: 'three_months', stepUpChallengeId: challengeId }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4GiftInvalidDuration.status, 400);
  assert.deepEqual(await readJson(p4GiftInvalidDuration), { ok: false, error: { code: 'validation_error', message: 'Validation failed', details: ['invalid_duration'] } });

  const p4GiftOk = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-5/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'commercial-gift-replay' }, body: JSON.stringify({ duration: 'two_weeks', targetUserId: 'user-ignored', stepUpChallengeId: challengeId }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  const p4GiftOkJson = await readJson(p4GiftOk);
  assert.equal(p4GiftOk.status, 200);
  assert.equal(p4GiftOkJson.ok, true);
  assert.equal((p4GiftOkJson.data as { targetUserId: string }).targetUserId, 'user-5');
  assertNoSensitiveLeak(p4GiftOkJson);
  assert.equal(commercialMutationCounts.gift, 1);
  const p4GiftReplay = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-5/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'commercial-gift-replay' }, body: JSON.stringify({ duration: 'two_weeks', targetUserId: 'user-ignored', stepUpChallengeId: challengeId }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.deepEqual(await readJson(p4GiftReplay), p4GiftOkJson);
  assert.equal(commercialMutationCounts.gift, 1);


  const p4GiftCrossTargetReplay = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-6/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'commercial-gift-replay' }, body: JSON.stringify({ duration: 'two_weeks', targetUserId: 'user-ignored', stepUpChallengeId: challengeId }) }), { params: Promise.resolve({ userId: 'user-6' }) });
  assert.equal(p4GiftCrossTargetReplay.status, 409);
  assert.equal(commercialMutationCounts.gift, 1);
  setAuthTestOverrides({ subjectResolver: async () => ({ subjectKind: 'user' as const, subjectId: 'admin-b-subject', userId: 'admin-b' }), internalToken: 'internal-token' });
  const p4GiftCrossActorReplay = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-5/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'commercial-gift-replay' }, body: JSON.stringify({ duration: 'two_weeks', targetUserId: 'user-ignored', stepUpChallengeId: challengeId }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4GiftCrossActorReplay.status, 409);
  setAuthTestOverrides({ subjectResolver: async () => subject, internalToken: 'internal-token' });

  const p4CrossActionReplay = await adminCommercialRestrictUserRoute.POST(request('https://x/api/admin/commercial/users/user-5/restrict', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'commercial-gift-replay' }, body: JSON.stringify({ restrictionKind: 'suspended', stepUpChallengeId: challengeId }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4CrossActionReplay.status, 409);
  assert.equal(commercialMutationCounts.restrict, 0);

  const p4GiftReuse = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-5/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ duration: 'two_weeks', stepUpChallengeId: challengeId }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4GiftReuse.status, 403);
  assert.equal(commercialMutationCounts.gift, 1);



  const createVerifiedStepUp = async (actionKind: string, targetUserId: string) => {
    const created = await adminStepUpChallengeRoute.POST(request('https://x/api/admin/security/step-up/challenge', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ providerKind: 'fixture_test_only', actionKind, targetUserId }) }));
    assert.equal(created.status, 200);
    const createdJson = await readJson(created);
    const id = (createdJson.data as { challengeId: string }).challengeId;
    const verified = await adminStepUpVerifyRoute.POST(request('https://x/api/admin/security/step-up/verify', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ challengeId: id, providerKind: 'fixture_test_only', proof: 'fixture-pass' }) }));
    assert.equal(((await readJson(verified)).data as { verified: boolean }).verified, true);
    return id;
  };

  const wrongTargetChallenge = await createVerifiedStepUp('focus_plan_gift', 'user-wrong-target');
  assert.equal((await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-5/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ duration: 'two_weeks', stepUpChallengeId: wrongTargetChallenge }) }), { params: Promise.resolve({ userId: 'user-5' }) })).status, 403);
  const wrongActionChallenge = await createVerifiedStepUp('user_restriction', 'user-5');
  assert.equal((await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-5/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ duration: 'two_weeks', stepUpChallengeId: wrongActionChallenge }) }), { params: Promise.resolve({ userId: 'user-5' }) })).status, 403);


  const actorBoundChallenge = await createVerifiedStepUp('focus_plan_gift', 'user-5');
  setAuthTestOverrides({ subjectResolver: async () => ({ subjectKind: 'user' as const, subjectId: 'admin-b-subject', userId: 'admin-b' }), internalToken: 'internal-token' });
  const p4WrongActor = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-5/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ duration: 'two_weeks', stepUpChallengeId: actorBoundChallenge }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4WrongActor.status, 403);
  setAuthTestOverrides({ subjectResolver: async () => subject, internalToken: 'internal-token' });


  const staleRouteChallenge = await createVerifiedStepUp('focus_plan_gift', 'user-5');
  expireStepUpChallengeFreshness(staleRouteChallenge);
  const p4StaleChallenge = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-5/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ duration: 'two_weeks', stepUpChallengeId: staleRouteChallenge }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4StaleChallenge.status, 403);

  const p4RetractNoStepUp = await adminCommercialRetractFocusGiftRoute.POST(request('https://x/api/admin/commercial/users/user-5/retract-focus-gift', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ giftRecordId: 'gift-1' }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4RetractNoStepUp.status, 403);
  assert.equal(JSON.stringify(await readJson(p4RetractNoStepUp)).includes('step_up_required'), true);

  const p4RestrictNoStepUp = await adminCommercialRestrictUserRoute.POST(request('https://x/api/admin/commercial/users/user-5/restrict', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ restrictionKind: 'suspended' }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4RestrictNoStepUp.status, 403);
  assert.equal(JSON.stringify(await readJson(p4RestrictNoStepUp)).includes('step_up_required'), true);


  const retractChallengeId = await createVerifiedStepUp('focus_plan_gift_retract', 'user-5');
  const p4RetractOk = await adminCommercialRetractFocusGiftRoute.POST(request('https://x/api/admin/commercial/users/user-5/retract-focus-gift', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ giftRecordId: ((await readJson(await adminCommercialControlSnapshotRoute.GET(request('https://x/api/admin/commercial/users/user-5/control-snapshot', { headers: { 'x-elceo-internal-token': 'internal-token' } }), { params: Promise.resolve({ userId: 'user-5' }) }))).data as { snapshot: { activeGift: { giftRecordId: string } } }).snapshot.activeGift.giftRecordId, stepUpChallengeId: retractChallengeId }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4RetractOk.status, 200);

  const restrictChallengeId = await createVerifiedStepUp('user_restriction', 'user-5');
  const p4RestrictOk = await adminCommercialRestrictUserRoute.POST(request('https://x/api/admin/commercial/users/user-5/restrict', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ restrictionKind: 'suspended', stepUpChallengeId: restrictChallengeId }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4RestrictOk.status, 200);
  const p4RestrictReuse = await adminCommercialRestrictUserRoute.POST(request('https://x/api/admin/commercial/users/user-5/restrict', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ restrictionKind: 'suspended', stepUpChallengeId: restrictChallengeId }) }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4RestrictReuse.status, 403);
  assert.deepEqual(await readJson(p4RestrictReuse), { ok: false, error: { code: 'forbidden', message: 'Step-up verification failed', details: ['step_up_verification_failed'] } });
  assert.equal(commercialMutationCounts.restrict, 1);

  for (const field of ['ip', 'ipAddress', 'cidr', 'ipBan']) {
    const p4RestrictIpBlocked = await adminCommercialRestrictUserRoute.POST(request('https://x/api/admin/commercial/users/user-5/restrict', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ restrictionKind: 'banned', stepUpVerification: { status: 'verified', verifiedAt: new Date().toISOString() }, [field]: '1.2.3.4' }) }), { params: Promise.resolve({ userId: 'user-5' }) });
    assert.equal(p4RestrictIpBlocked.status, 400);
    assert.deepEqual(await readJson(p4RestrictIpBlocked), { ok: false, error: { code: 'validation_error', message: 'Validation failed', details: ['ip_ban_not_supported'] } });
  }

  const p4SnapshotNoToken = await adminCommercialControlSnapshotRoute.GET(request('https://x/api/admin/commercial/users/user-5/control-snapshot'), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4SnapshotNoToken.status, 403);
  assert.equal((await readJson(p4SnapshotNoToken)).ok, false);
  const p4SnapshotOk = await adminCommercialControlSnapshotRoute.GET(request('https://x/api/admin/commercial/users/user-5/control-snapshot', { headers: { 'x-elceo-internal-token': 'internal-token' } }), { params: Promise.resolve({ userId: 'user-5' }) });
  const p4SnapshotOkJson = await readJson(p4SnapshotOk);
  assert.equal(p4SnapshotOk.status, 200);
  assert.equal((p4SnapshotOkJson.data as { targetUserId: string }).targetUserId, 'user-5');
  assertNoSensitiveLeak(p4SnapshotOkJson);


  setCommercialPersistenceFailureMode('snapshot');
  const p4SnapshotPersistenceFailure = await adminCommercialControlSnapshotRoute.GET(request('https://x/api/admin/commercial/users/user-5/control-snapshot', { headers: { 'x-elceo-internal-token': 'internal-token' } }), { params: Promise.resolve({ userId: 'user-5' }) });
  assert.equal(p4SnapshotPersistenceFailure.status, 503);
  const p4SnapshotPersistenceFailureJson = await readJson(p4SnapshotPersistenceFailure);
  assert.equal(JSON.stringify(p4SnapshotPersistenceFailureJson).includes('commercial_persistence_unavailable'), true);
  assert.equal(JSON.stringify(p4SnapshotPersistenceFailureJson).includes('sql'), false);
  setCommercialPersistenceFailureMode('none');

  setCommercialPersistenceFailureMode('social');
  const socialGet503 = await accountProfileSocialIdentifiersRoute.GET();
  assert.equal(socialGet503.status, 503);
  assert.equal(JSON.stringify(await readJson(socialGet503)).includes('commercial_persistence_unavailable'), true);
  setCommercialPersistenceFailureMode('none');

  resetCommercialMutationCounts();
  const failAfterConsumeChallenge = await createVerifiedStepUp('focus_plan_gift', 'user-retry-2');
  setCommercialPersistenceFailureMode('gift-after-consume');
  const retryAfterConsumeFail = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-retry-2/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'retry-after-consume' }, body: JSON.stringify({ duration: 'two_weeks', stepUpChallengeId: failAfterConsumeChallenge }) }), { params: Promise.resolve({ userId: 'user-retry-2' }) });
  assert.equal(retryAfterConsumeFail.status, 503);
  const retryNewChallenge = await createVerifiedStepUp('focus_plan_gift', 'user-retry-2');
  setCommercialPersistenceFailureMode('none');
  const retryAfterConsumeOk = await adminCommercialGiftFocusPlanRoute.POST(request('https://x/api/admin/commercial/users/user-retry-2/gift-focus-plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'retry-after-consume' }, body: JSON.stringify({ duration: 'two_weeks', stepUpChallengeId: retryNewChallenge }) }), { params: Promise.resolve({ userId: 'user-retry-2' }) });
  assert.equal(retryAfterConsumeOk.status, 200);
  assert.equal(commercialMutationCounts.gift, 1);

  const metricsUnauthorized = await adminCommercialMetricsRoute.GET(request('https://x/api/admin/commercial/metrics'));
  assert.equal(metricsUnauthorized.status, 403);
  assert.equal((await readJson(metricsUnauthorized)).ok, false);
  blockedFeatures = new Set(['admin.read']);
  const metricsBlocked = await adminCommercialMetricsRoute.GET(request('https://x/api/admin/commercial/metrics', { headers: { 'x-elceo-internal-token': 'internal-token' } }));
  assert.equal(metricsBlocked.status, 403);
  assert.equal((await readJson(metricsBlocked)).ok, false);
  blockedFeatures = new Set();
  const metricsOk = await adminCommercialMetricsRoute.GET(request('https://x/api/admin/commercial/metrics', { headers: { 'x-elceo-internal-token': 'internal-token' } }));
  assert.equal(metricsOk.status, 200);
  const metricsOkJson = await readJson(metricsOk);
  assert.equal(metricsOkJson.ok, true);
  const metricsSerialized = JSON.stringify(metricsOkJson).toLowerCase();
  assert.equal(metricsSerialized.includes('ip_ban'), false);
  assert.equal(metricsSerialized.includes('raw provider payload'), false);
  assert.equal(metricsSerialized.includes('token'), false);
  assert.equal(metricsSerialized.includes('session'), false);
  assert.equal(metricsSerialized.includes('auth'), false);
  assertNoSensitiveLeak(metricsOkJson);
  const revenueStatus = (((metricsOkJson.data as { snapshot?: { revenue?: { dataStatus?: string; }; }; }).snapshot?.revenue?.dataStatus) ?? '');
  assert.equal(['fixture_only', 'estimated'].includes(revenueStatus), true);
  const metricsInvalid = await adminCommercialMetricsRoute.GET(request('https://x/api/admin/commercial/metrics?period=invalid_period&asOf=nope', { headers: { 'x-elceo-internal-token': 'internal-token' } }));
  assert.equal(metricsInvalid.status, 400);
  assert.deepEqual(await readJson(metricsInvalid), { ok: false, error: { code: 'validation_error', message: 'Validation failed', details: ['query invalid'] } });


  const reconcileForbidden = await internalBillingReconcileRoute.POST(request('https://x/api/internal/billing/reconcile', { method: 'POST', body: JSON.stringify({ providerKind: 'stripe', sourceEventId: 'evt-1' }) }));
  assert.equal(reconcileForbidden.status, 403);
  assert.deepEqual(await readJson(reconcileForbidden), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  blockedFeatures = new Set(['admin.ops']);
  const reconcileUnauthorized = await internalBillingReconcileRoute.POST(request('https://x/api/internal/billing/reconcile', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ providerKind: 'stripe', sourceEventId: 'evt-1' }) }));
  assert.equal(reconcileUnauthorized.status, 403);
  blockedFeatures = new Set();
  const reconcileOk = await internalBillingReconcileRoute.POST(request('https://x/api/internal/billing/reconcile', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'idem-success' }, body: JSON.stringify({ providerKind: 'stripe', sourceEventId: 'evt-1', subjectId: 'user-2' }) }));
  assert.deepEqual(await readJson(reconcileOk), { ok: true, data: { run: await mockApplicationStateRuntime.billingLifecycle.reconcileProviderEvent('stripe', 'evt-1', 'user-2') } });
  assert.equal(securityCompletedCount > 0, true);
  assert.equal(securityAuditCount > 0, true);
  securityDecisionMode = 'rate_limited';
  const reconcileRateLimited = await internalBillingReconcileRoute.POST(request('https://x/api/internal/billing/reconcile', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ providerKind: 'stripe', sourceEventId: 'evt-1', subjectId: 'user-2' }) }));
  assert.deepEqual(await readJson(reconcileRateLimited), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'idempotency_conflict';
  const reconcileIdempotencyConflict = await internalBillingReconcileRoute.POST(request('https://x/api/internal/billing/reconcile', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'idem-1' }, body: JSON.stringify({ providerKind: 'stripe', sourceEventId: 'evt-1', subjectId: 'user-2' }) }));
  assert.deepEqual(await readJson(reconcileIdempotencyConflict), { ok: false, error: { code: 'conflict', message: 'Idempotency conflict', details: ['idempotency_conflict'] } });
  securityDecisionMode = 'allowed';
  assert.deepEqual(await readJson(await internalBillingPolicyEvaluateRoute.POST(request('https://x/api/internal/billing/policy/evaluate', { method: 'POST', body: JSON.stringify({ subjectId: 'user-2' }) }))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  blockedFeatures = new Set(['admin.ops']);
  const evaluateBlocked = await internalBillingPolicyEvaluateRoute.POST(request('https://x/api/internal/billing/policy/evaluate', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2' }) }));
  assert.deepEqual(await readJson(evaluateBlocked), { ok: false, error: { code: 'forbidden', message: 'Feature access blocked', details: ['feature:admin.ops', 'reason:feature_not_in_plan', 'accessLevel:blocked'] } });
  blockedFeatures = new Set();
  installMocks();
  assert.deepEqual(await readJson(await internalBillingPolicyEvaluateRoute.POST(request('https://x/api/internal/billing/policy/evaluate', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2', sourceReconciliationRunId: 'run-2' }) }))), { ok: true, data: { evaluation: await mockApplicationStateRuntime.billingPolicy.evaluateBillingPolicyForSubject('user', 'user-2', 'run-2') } });
  securityDecisionMode = 'rate_limited';
  assert.deepEqual(await readJson(await internalBillingPolicyEvaluateRoute.POST(request('https://x/api/internal/billing/policy/evaluate', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2' }) }))), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'allowed';

  const providerNoToken = await internalBillingProviderEventsRoute.POST(request('https://x/api/internal/billing/provider-events', { method: 'POST', body: JSON.stringify({}) }));
  assert.equal(providerNoToken.status, 403);
  assert.deepEqual(await readJson(providerNoToken), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });

  const providerIngest = await internalBillingProviderEventsRoute.POST(request('https://x/api/internal/billing/provider-events', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ providerKind: 'stripe', externalEventId: 'evt-1', eventType: 'customer.subscription.created', createdAt: '2026-01-01T00:00:00.000Z', dataJson: '{}' }) }));
  assert.equal(providerIngest.status, 200);
  assert.deepEqual(await readJson(providerIngest), { ok: true, data: { result: { accepted: true, deduplicated: false, translated: true, externalEventId: 'evt-1', providerKind: 'stripe', processingResultCode: 'translated_subscription_created', linkedBillingSubscriptionId: 'sub-1', linkedSubjectId: 'user-1', processedAt: '2026-01-01T00:00:00.000Z' } } });
  securityDecisionMode = 'rate_limited';
  assert.deepEqual(await readJson(await internalBillingProviderEventsRoute.POST(request('https://x/api/internal/billing/provider-events', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ providerKind: 'stripe', externalEventId: 'evt-rate', eventType: 'customer.subscription.created', createdAt: '2026-01-01T00:00:00.000Z', dataJson: '{}' }) }))), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'allowed';

  blockedFeatures = new Set(['admin.ops']);
  const providerReplayForbidden = await internalBillingProviderReplayRoute.POST(request('https://x/api/internal/billing/provider-events/replay', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ limit: 5 }) }));
  assert.equal(providerReplayForbidden.status, 403);
  assert.deepEqual(await readJson(providerReplayForbidden), { ok: false, error: { code: 'forbidden', message: 'Feature access blocked', details: ['feature:admin.ops', 'reason:feature_not_in_plan', 'accessLevel:blocked'] } });
  blockedFeatures = new Set();
  const providerReplayOk = await internalBillingProviderReplayRoute.POST(request('https://x/api/internal/billing/provider-events/replay', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ limit: 5 }) }));
  assert.equal(providerReplayOk.status, 200);
  assert.deepEqual(await readJson(providerReplayOk), { ok: true, data: { results: [{ accepted: true, deduplicated: false, translated: true, externalEventId: 'evt-2', providerKind: 'stripe', processingResultCode: 'translated_subscription_updated', linkedBillingSubscriptionId: 'sub-1', linkedSubjectId: 'user-1', processedAt: '2026-01-01T00:00:00.000Z' }] } });

  blockedFeatures = new Set(['admin.ops']);
  const mapCreateDenied = await adminBillingProviderPlanMappingRoute.POST(request('https://x/api/admin/billing/provider-plan-mapping', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ providerKind: 'stripe', externalPriceId: 'price_1', mappedPlanKind: 'premium', interval: 'monthly' }) }));
  assert.equal(mapCreateDenied.status, 403);
  assert.deepEqual(await readJson(mapCreateDenied), { ok: false, error: { code: 'forbidden', message: 'Feature access blocked', details: ['feature:admin.ops', 'reason:feature_not_in_plan', 'accessLevel:blocked'] } });
  blockedFeatures = new Set();
  const mapCreate = await adminBillingProviderPlanMappingRoute.POST(request('https://x/api/admin/billing/provider-plan-mapping', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ providerKind: 'stripe', externalPriceId: 'price_1', mappedPlanKind: 'premium', interval: 'monthly' }) }));
  assert.equal(mapCreate.status, 200);
  assert.deepEqual(await readJson(mapCreate), { ok: true, data: { mapping: { providerKind: 'stripe', externalPriceId: 'price_1', mappedPlanKind: 'premium', interval: 'month' } } });

  const mappingsNoToken = await adminBillingProviderPlanMappingsRoute.GET(request('https://x/api/admin/billing/provider-plan-mappings?providerKind=stripe'));
  assert.equal(mappingsNoToken.status, 403);
  assert.deepEqual(await readJson(mappingsNoToken), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  const mappings = await adminBillingProviderPlanMappingsRoute.GET(request('https://x/api/admin/billing/provider-plan-mappings?providerKind=stripe', { headers: { 'x-elceo-internal-token': 'internal-token' } }));
  assert.equal(mappings.status, 200);
  assert.deepEqual(await readJson(mappings), { ok: true, data: { mappings: [{ providerKind: 'stripe', externalPriceId: 'price_1', mappedPlanKind: 'premium', interval: 'month' }] } });

  const subjectEvents = await adminBillingProviderEventsRoute.GET(request('https://x/api/admin/billing/provider-events?subjectId=user-1&limit=1', { headers: { 'x-elceo-internal-token': 'internal-token' } }));
  assert.equal(subjectEvents.status, 200);
  assert.deepEqual(await readJson(subjectEvents), { ok: true, data: { mode: 'subject', events: [{ externalEventId: 'evt-subject' }] } });
  const unprocessedEvents = await adminBillingProviderEventsRoute.GET(request('https://x/api/admin/billing/provider-events?limit=1', { headers: { 'x-elceo-internal-token': 'internal-token' } }));
  assert.equal(unprocessedEvents.status, 200);
  assert.deepEqual(await readJson(unprocessedEvents), { ok: true, data: { mode: 'unprocessed', events: [{ externalEventId: 'evt-unprocessed' }] } });
  assert.deepEqual(await readJson(await adminBillingPolicyRoute.GET(request('https://x/api/admin/billing/policy?subjectId=user-2'))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  assert.deepEqual(await readJson(await adminBillingPolicyRoute.GET(request('https://x/api/admin/billing/policy?subjectId=user-2', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: true, data: { snapshot: await mockApplicationStateRuntime.billingPolicy.getBillingPolicySnapshot('user', 'user-2') } });
  assert.deepEqual(await readJson(await adminBillingPolicyTransitionsRoute.GET(request('https://x/api/admin/billing/policy/transitions?subjectId=user-2'))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  assert.deepEqual(await readJson(await adminBillingPolicyTransitionsRoute.GET(request('https://x/api/admin/billing/policy/transitions?subjectId=user-2&limit=4', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: true, data: { transitions: await mockApplicationStateRuntime.billingPolicy.listRecentBillingPolicyTransitions('user', 'user-2', 4) } });

  assert.deepEqual(await readJson(await adminBillingOperationsSummaryRoute.GET(request('https://x/api/admin/billing/operations/summary'))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  assert.deepEqual(await readJson(await adminBillingOperationsSummaryRoute.GET(request('https://x/api/admin/billing/operations/summary', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: true, data: { summary: await mockApplicationStateRuntime.billingAdmin.getBillingAdminOperationalSummary() } });
  assert.deepEqual(await readJson(await adminBillingOperationsFailuresRoute.GET(request('https://x/api/admin/billing/operations/failures'))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  assert.deepEqual(await readJson(await adminBillingOperationsFailuresRoute.GET(request('https://x/api/admin/billing/operations/failures?limit=7', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: true, data: { failures: await mockApplicationStateRuntime.billingAdmin.listRecentBillingReconciliationFailures(7), limit: 7 } });
  assert.deepEqual(await readJson(await adminBillingOperationsRetryCandidatesRoute.GET(request('https://x/api/admin/billing/operations/retry-candidates?limit=5', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: true, data: { candidates: await mockApplicationStateRuntime.billingAdmin.listBillingRetryCandidates(5), limit: 5 } });
  assert.deepEqual(await readJson(await adminBillingOperationsSubjectRoute.GET(request('https://x/api/admin/billing/operations/subject', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: false, error: { code: 'validation_error', message: 'Validation failed', details: ['subjectId must be non-empty string'] } });
  assert.deepEqual(await readJson(await adminBillingOperationsSubjectRoute.GET(request('https://x/api/admin/billing/operations/subject?subjectId=user-2', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: true, data: { snapshot: await mockApplicationStateRuntime.billingAdmin.getBillingAdminSubjectSnapshot('user', 'user-2') } });
  assert.deepEqual(await readJson(await internalBillingReconcileRetryRoute.POST(request('https://x/api/internal/billing/reconcile/retry', { method: 'POST', body: JSON.stringify({ subjectId: 'user-2' }) }))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  assert.deepEqual(await readJson(await internalBillingReconcileRetryRoute.POST(request('https://x/api/internal/billing/reconcile/retry', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2' }) }))), { ok: true, data: { run: await mockApplicationStateRuntime.billingLifecycle.reconcileProviderEvent('stripe', 'evt-1', 'user-2') } });
  securityDecisionMode = 'rate_limited';
  assert.deepEqual(await readJson(await internalBillingReconcileRetryRoute.POST(request('https://x/api/internal/billing/reconcile/retry', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2' }) }))), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'allowed';

  assert.deepEqual(await readJson(await adminBillingOrchestrationLatestRoute.GET(request('https://x/api/admin/billing/orchestration/latest'))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  assert.deepEqual(await readJson(await adminBillingOrchestrationLatestRoute.GET(request('https://x/api/admin/billing/orchestration/latest', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: false, error: { code: 'validation_error', message: 'Validation failed', details: ['subjectId must be non-empty string'] } });
  assert.deepEqual(await readJson(await adminBillingOrchestrationLatestRoute.GET(request('https://x/api/admin/billing/orchestration/latest?subjectId=user-2', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: true, data: { run: await mockApplicationStateRuntime.billingOrchestration.getLatestBillingOrchestrationRun('user', 'user-2') } });

  assert.deepEqual(await readJson(await adminBillingOrchestrationRunsRoute.GET(request('https://x/api/admin/billing/orchestration/runs'))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  assert.deepEqual(await readJson(await adminBillingOrchestrationRunsRoute.GET(request('https://x/api/admin/billing/orchestration/runs', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: false, error: { code: 'validation_error', message: 'Validation failed', details: ['subjectId must be non-empty string'] } });
  assert.deepEqual(await readJson(await adminBillingOrchestrationRunsRoute.GET(request('https://x/api/admin/billing/orchestration/runs?subjectId=user-2&limit=4', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: true, data: { runs: await mockApplicationStateRuntime.billingOrchestration.listRecentBillingOrchestrationRuns('user', 'user-2', 4), limit: 4 } });

  assert.deepEqual(await readJson(await adminBillingOrchestrationSubjectRoute.GET(request('https://x/api/admin/billing/orchestration/subject'))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  assert.deepEqual(await readJson(await adminBillingOrchestrationSubjectRoute.GET(request('https://x/api/admin/billing/orchestration/subject', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: false, error: { code: 'validation_error', message: 'Validation failed', details: ['subjectId must be non-empty string'] } });
  assert.deepEqual(await readJson(await adminBillingOrchestrationSubjectRoute.GET(request('https://x/api/admin/billing/orchestration/subject?subjectId=user-2', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: true, data: { snapshot: await mockApplicationStateRuntime.billingOrchestration.getBillingOrchestrationSubjectSnapshot('user', 'user-2') } });

  assert.deepEqual(await readJson(await marketEvidencePayloadsRoute.GET(request('https://x/api/admin/market-evidence/payloads'))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  assert.equal((await readJson(await marketEvidencePayloadsRoute.GET(request('https://x/api/admin/market-evidence/payloads?asset=bad', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.equal((await readJson(await marketEvidencePayloadsRoute.GET(request('https://x/api/admin/market-evidence/payloads?asset=xau_usd&limit=bad', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.equal((await readJson(await marketEvidencePayloadsRoute.GET(request('https://x/api/admin/market-evidence/payloads?asset=xau_usd', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  const marketEvidenceInjection = await readJson(await marketEvidencePayloadsRoute.GET(request("https://x/api/admin/market-evidence/payloads?asset=' OR 1=1 --", { headers: { 'x-elceo-internal-token': 'internal-token' } })));
  assert.deepEqual(marketEvidenceInjection, { ok: false, error: { code: 'validation_error', message: 'Validation failed', details: ['asset is invalid'] } });
  assertNoSensitiveLeak(marketEvidenceInjection);
  const marketEvidenceLimitAbuse = await readJson(await marketEvidencePayloadsRoute.GET(request('https://x/api/admin/market-evidence/payloads?asset=xau_usd&limit=999999', { headers: { 'x-elceo-internal-token': 'internal-token' } })));
  assert.deepEqual(marketEvidenceLimitAbuse, { ok: false, error: { code: 'validation_error', message: 'Validation failed', details: ['limit must be integer 1..100'] } });

  assert.equal((await readJson(await marketEvidenceProviderRequestRoute.GET(request('https://x/api/admin/market-evidence/provider-request', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.deepEqual(await readJson(await marketEvidenceProviderRequestRoute.GET(request('https://x/api/admin/market-evidence/provider-request?requestId=req-1', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: true, data: { request: null } });
  assert.equal((await readJson(await marketEvidenceProviderResponseRoute.GET(request('https://x/api/admin/market-evidence/provider-response', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.deepEqual(await readJson(await marketEvidenceProviderResponseRoute.GET(request('https://x/api/admin/market-evidence/provider-response?requestId=req-1', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: true, data: { response: null } });
  assert.equal((await readJson(await marketEvidencePayloadReplayRoute.GET(request('https://x/api/admin/market-evidence/payload-replay', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.deepEqual(await readJson(await marketEvidencePayloadReplayRoute.GET(request('https://x/api/admin/market-evidence/payload-replay?payloadId=p-1', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: true, data: { replay: null } });
  assert.equal((await readJson(await marketEvidenceQualityRoute.GET(request('https://x/api/admin/market-evidence/quality?evidenceClass=bad', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.equal((await readJson(await marketEvidenceQualityRoute.GET(request('https://x/api/admin/market-evidence/quality?evaluatedAt=bad', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.equal((await readJson(await marketEvidenceQualityRoute.GET(request('https://x/api/admin/market-evidence/quality?asset=xau_usd', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.equal((await readJson(await marketEvidenceReasoningInputRoute.GET(request('https://x/api/admin/market-evidence/reasoning-input?minFinalQualityScore=bad', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.equal((await readJson(await marketEvidenceReasoningInputRoute.GET(request('https://x/api/admin/market-evidence/reasoning-input?asset=xau_usd', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.equal((await readJson(await marketEvidenceWeightedRoute.GET(request('https://x/api/admin/market-evidence/weighted?asset=xau_usd&horizon=bad', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.equal((await readJson(await marketEvidenceWeightedRoute.GET(request('https://x/api/admin/market-evidence/weighted', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.equal((await readJson(await marketEvidenceWeightedRoute.GET(request('https://x/api/admin/market-evidence/weighted?asset=xau_usd&horizon=intraday', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.equal((await readJson(await marketEvidenceCognitionRoute.GET(request('https://x/api/admin/market-evidence/cognition?asset=xau_usd&horizon=bad', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.equal((await readJson(await marketEvidenceCognitionRoute.GET(request('https://x/api/admin/market-evidence/cognition', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.equal((await readJson(await marketEvidenceCognitionRoute.GET(request('https://x/api/admin/market-evidence/cognition?asset=xau_usd&horizon=intraday', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.deepEqual(await readJson(await adminSeoFeedRoute.GET(request('https://x/api/admin/seo/feed'))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  assert.equal((await readJson(await adminSeoFeedRoute.GET(request('https://x/api/admin/seo/feed?pageKind=bad', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.equal((await readJson(await adminSeoFeedRoute.GET(request('https://x/api/admin/seo/feed', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.equal((await readJson(await adminSeoFeedRoute.GET(request('https://x/api/admin/seo/feed?slug=test', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.equal((await readJson(await adminSeoFeedRoute.GET(request('https://x/api/admin/seo/feed?slug=../../etc/passwd', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.equal((await readJson(await adminSeoFeedRoute.GET(request('https://x/api/admin/seo/feed?pageKind=<script>', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);

  assert.equal((await readJson(await adminSeoSitemapRoute.GET(request('https://x/api/admin/seo/sitemap', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.deepEqual(await readJson(await scheduledIngestionPoliciesRoute.GET(request('https://x/api/admin/market-evidence/scheduled-ingestion/policies'))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  assert.equal((await readJson(await scheduledIngestionPoliciesRoute.GET(request('https://x/api/admin/market-evidence/scheduled-ingestion/policies?providerId=&generatedAt=bad', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.equal((await readJson(await scheduledIngestionPoliciesRoute.GET(request('https://x/api/admin/market-evidence/scheduled-ingestion/policies', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.equal((await readJson(await scheduledIngestionPoliciesRoute.GET(request('https://x/api/admin/market-evidence/scheduled-ingestion/policies?providerId=tiingo_market_data', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.deepEqual(await readJson(await scheduledIngestionRunsRoute.GET(request('https://x/api/admin/market-evidence/scheduled-ingestion/runs'))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  assert.equal((await readJson(await scheduledIngestionRunsRoute.GET(request('https://x/api/admin/market-evidence/scheduled-ingestion/runs?status=bad', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.equal((await readJson(await scheduledIngestionRunsRoute.GET(request('https://x/api/admin/market-evidence/scheduled-ingestion/runs?providerId=tiingo_market_data&capability=not_a_capability', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.deepEqual(await readJson(await scheduledIngestionRunsRoute.GET(request('https://x/api/admin/market-evidence/scheduled-ingestion/runs?runId=run-1', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: true, data: { mode: 'runId', run: null } });
  assert.deepEqual(await readJson(await scheduledIngestionRunsRoute.GET(request('https://x/api/admin/market-evidence/scheduled-ingestion/runs?providerId=tiingo_market_data&capability=market_price_history', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: true, data: { mode: 'provider', runs: [] } });
  assert.deepEqual(await readJson(await scheduledIngestionRunsRoute.GET(request('https://x/api/admin/market-evidence/scheduled-ingestion/runs?providerId=tiingo_market_data&capability=cot_report', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: true, data: { mode: 'provider', runs: [] } });
  assert.deepEqual(await readJson(await scheduledIngestionRunsRoute.GET(request('https://x/api/admin/market-evidence/scheduled-ingestion/runs?status=failed', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: true, data: { mode: 'status', runs: [] } });
  const scheduledRunIdInjection = await readJson(await scheduledIngestionRunsRoute.GET(request("https://x/api/admin/market-evidence/scheduled-ingestion/runs?runId=' OR '1'='1", { headers: { 'x-elceo-internal-token': 'internal-token' } })));
  assert.deepEqual(scheduledRunIdInjection, { ok: false, error: { code: 'validation_error', message: 'Validation failed', details: ['runId is invalid'] } });
  assertNoSensitiveLeak(scheduledRunIdInjection);
  assert.equal((await readJson(await scheduledIngestionRunsRoute.GET(request('https://x/api/admin/market-evidence/scheduled-ingestion/runs?providerId=tiingo_market_data&capability=market_price_history; DROP TABLE x', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.equal((await readJson(await scheduledIngestionRunsRoute.GET(request('https://x/api/admin/market-evidence/scheduled-ingestion/runs?status=<script>', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);

  assert.equal((await readJson(await scheduledIngestionReplayRoute.GET(request('https://x/api/admin/market-evidence/scheduled-ingestion/replay', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, false);
  assert.deepEqual(await readJson(await scheduledIngestionReplayRoute.GET(request('https://x/api/admin/market-evidence/scheduled-ingestion/replay?runId=run-1', { headers: { 'x-elceo-internal-token': 'internal-token' } }))), { ok: true, data: { replay: null } });
  
  assert.deepEqual(await readJson(await scheduledIngestionReplayRoute.POST(request('https://x/api/admin/market-evidence/scheduled-ingestion/replay', { method: 'POST', body: JSON.stringify({ runId: 'run-1' }) }))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  assert.equal((await readJson(await scheduledIngestionReplayRoute.POST(request('https://x/api/admin/market-evidence/scheduled-ingestion/replay', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({}) })))).ok, false);
  assert.equal((await readJson(await scheduledIngestionReplayRoute.POST(request('https://x/api/admin/market-evidence/scheduled-ingestion/replay', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ runId: 'run-1', replayMode: 'production_live' }) })))).ok, false);
  const replayRouteOk = await readJson(await scheduledIngestionReplayRoute.POST(request('https://x/api/admin/market-evidence/scheduled-ingestion/replay', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'sched-replay' }, body: JSON.stringify({ runId: 'run-1' }) })));
  assert.equal(replayRouteOk.ok, true);
  assert.equal((replayRouteOk.data as { report: { run: { providerCallMode: string } } }).report.run.providerCallMode, 'replay_captured_payload');
  const scheduledInspection = await readJson(await scheduledIngestionInspectionRoute.GET(request('https://x/api/admin/market-evidence/scheduled-ingestion/inspection', { headers: { 'x-elceo-internal-token': 'internal-token' } })));
  assert.equal(scheduledInspection.ok, true);
  assert.equal((scheduledInspection.data as { snapshot: { providerApiGate: { liveExecution: string } } }).snapshot.providerApiGate.liveExecution, 'blocked_until_rc_h');
  assert.deepEqual(await readJson(await marketEvidenceInspectionRoute.GET(request('https://x/api/admin/market-evidence/inspection'))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  const invalidInspectionSection = await readJson(await marketEvidenceInspectionRoute.GET(request('https://x/api/admin/market-evidence/inspection?section=bad', { headers: { 'x-elceo-internal-token': 'internal-token' } })));
  assert.equal(invalidInspectionSection.ok, false, JSON.stringify(invalidInspectionSection));
  const providerInspection = await readJson(await marketEvidenceInspectionRoute.GET(request('https://x/api/admin/market-evidence/inspection?section=provider_registry', { headers: { 'x-elceo-internal-token': 'internal-token' } })));
  assert.equal(providerInspection.ok, true, JSON.stringify(providerInspection));
assert.deepEqual(await readJson(await scheduledIngestionDryRunRoute.POST(request('https://x/api/admin/market-evidence/scheduled-ingestion/dry-run', { method: 'POST', body: JSON.stringify({ jobId: 'job-1' }) }))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  assert.equal((await readJson(await scheduledIngestionDryRunRoute.POST(request('https://x/api/admin/market-evidence/scheduled-ingestion/dry-run', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({}) })))).ok, false);
  assert.equal((await readJson(await scheduledIngestionDryRunRoute.POST(request('https://x/api/admin/market-evidence/scheduled-ingestion/dry-run', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ jobId: 'job-1', production_live: true }) })))).ok, false);
  assert.equal((await readJson(await scheduledIngestionDryRunRoute.POST(request('https://x/api/admin/market-evidence/scheduled-ingestion/dry-run', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ jobId: 'job-1', providerApiKey: 'secret' }) })))).ok, false);
  const scheduledInvalidJson = await readJson(await scheduledIngestionDryRunRoute.POST(request('https://x/api/admin/market-evidence/scheduled-ingestion/dry-run', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: '{"jobId":' })));
  assert.deepEqual(scheduledInvalidJson, { ok: false, error: { code: 'bad_request', message: 'Bad request', details: ['invalid_json'] } });
  assert.equal((await readJson(await scheduledIngestionDryRunRoute.POST(request('https://x/api/admin/market-evidence/scheduled-ingestion/dry-run', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ jobId: "job-1'; DROP TABLE x --" }) })))).ok, false);

  securityDecisionMode = 'rate_limited';
  assert.deepEqual(await readJson(await scheduledIngestionDryRunRoute.POST(request('https://x/api/admin/market-evidence/scheduled-ingestion/dry-run', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ jobId: 'job-1' }) }))), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'allowed';
  const dryRunRouteOk = await readJson(await scheduledIngestionDryRunRoute.POST(request('https://x/api/admin/market-evidence/scheduled-ingestion/dry-run', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'sched-dry-run' }, body: JSON.stringify({ jobId: 'job-1' }) })));
  assert.equal(dryRunRouteOk.ok, true);
  assert.equal((dryRunRouteOk.data as { report: { run: { providerCallMode: string } } }).report.run.providerCallMode, 'fixture_response');
  assert.equal(latestSecurityActionKind, 'internal_mutation');
  assert.deepEqual(await readJson(await internalTiingoFixtureIngestRoute.POST(request('https://x/api/internal/market-evidence/tiingo/fixture-ingest', { method: 'POST', body: JSON.stringify({ asset: 'xau_usd' }) }))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  assert.equal((await readJson(await internalTiingoFixtureIngestRoute.POST(request('https://x/api/internal/market-evidence/tiingo/fixture-ingest', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'fixture-ingest-ok' }, body: JSON.stringify({ asset: 'xau_usd' }) })))).ok, true);
  const tiingoInvalidJson = await readJson(await internalTiingoFixtureIngestRoute.POST(request('https://x/api/internal/market-evidence/tiingo/fixture-ingest', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: '{"asset":' })));
  assert.deepEqual(tiingoInvalidJson, { ok: false, error: { code: 'bad_request', message: 'Bad request', details: ['invalid_json'] } });
  assert.equal((await readJson(await internalTiingoFixtureIngestRoute.POST(request('https://x/api/internal/market-evidence/tiingo/fixture-ingest', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ asset: "' OR 1=1 --" }) })))).ok, false);

  assert.equal(latestSecurityActionKind, 'internal_mutation');


  assert.deepEqual(await readJson(await internalBillingOrchestrationRetryRoute.POST(request('https://x/api/internal/billing/orchestration/retry', { method: 'POST', body: JSON.stringify({ subjectId: 'user-2' }) }))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  assert.deepEqual(await readJson(await internalBillingOrchestrationRetryRoute.POST(request('https://x/api/internal/billing/orchestration/retry', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({}) }))), { ok: false, error: { code: 'validation_error', message: 'Validation failed', details: ['subjectId required'] } });
  assert.deepEqual(await readJson(await internalBillingOrchestrationRetryRoute.POST(request('https://x/api/internal/billing/orchestration/retry', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2' }) }))), { ok: true, data: { run: await mockApplicationStateRuntime.billingOrchestration.runRetryForSubject('user', 'user-2') } });
  securityDecisionMode = 'replayed';
  replayMode = 'stored';
  assert.equal((await readJson(await internalBillingOrchestrationRetryRoute.POST(request('https://x/api/internal/billing/orchestration/retry', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'idem-replay' }, body: JSON.stringify({ subjectId: 'user-2' }) })))).ok, true);
  replayMode = 'unavailable';
  assert.deepEqual(await readJson(await internalBillingOrchestrationRetryRoute.POST(request('https://x/api/internal/billing/orchestration/retry', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'idem-replay-miss' }, body: JSON.stringify({ subjectId: 'user-2' }) }))), { ok: false, error: { code: 'conflict', message: 'Replay unavailable', details: ['replay_unavailable', 'no_completed_response'] } });
  replayMode = 'malformed';
  assert.deepEqual(await readJson(await internalBillingOrchestrationRetryRoute.POST(request('https://x/api/internal/billing/orchestration/retry', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'idem-replay-bad' }, body: JSON.stringify({ subjectId: 'user-2' }) }))), { ok: false, error: { code: 'internal_error', message: 'Replay response parse failure', details: ['replay_response_malformed'] } });
  
  const previousGetPolicy = mockReasoningRuntime.marketIntelligence.getScheduledIngestionPolicySnapshot;
  mockReasoningRuntime.marketIntelligence.getScheduledIngestionPolicySnapshot = () => { throw new Error("select * from users where password='secret' at Object.<anonymous> sk_test_123 ELCEO_INTERNAL_API_TOKEN=abc"); };
  const redacted = await readJson(await scheduledIngestionPoliciesRoute.GET(request('https://x/api/admin/market-evidence/scheduled-ingestion/policies?providerId=tiingo_market_data', { headers: { 'x-elceo-internal-token': 'internal-token' } })));
  assert.deepEqual(redacted, { ok: false, error: { code: 'internal_error', message: 'Internal server error' } });
  assertNoSensitiveLeak(redacted);
  mockReasoningRuntime.marketIntelligence.getScheduledIngestionPolicySnapshot = previousGetPolicy;

securityDecisionMode = 'allowed';

  clearMocks();
}
