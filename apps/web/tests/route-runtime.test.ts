import assert from 'node:assert/strict';
import { clearAuthTestOverrides, setAuthTestOverrides } from '../lib/server/auth/subject';
import { setCompositionTestOverrides } from './stubs/composition';

import * as workspaceCurrentRoute from '../app/api/workspace/current/route';
import * as workspaceRefreshRoute from '../app/api/workspace/refresh/route';
import * as workspaceFreshnessRoute from '../app/api/workspace/freshness/route';
import * as workspaceHistoryRoute from '../app/api/workspace/history/route';
import * as workspaceAgendaRoute from '../app/api/workspace/agenda/route';

import * as journalCasesRoute from '../app/api/journal/cases/route';
import * as journalPlanRoute from '../app/api/journal/cases/[caseId]/plan/route';
import * as journalExecuteRoute from '../app/api/journal/cases/[caseId]/execute/route';
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
import * as accountEntitlementsRoute from '../app/api/account/entitlements/route';
import * as accountUsageRoute from '../app/api/account/usage/route';
import * as accountAccessDecisionsRoute from '../app/api/account/access-decisions/route';
import * as accountAccessCheckRoute from '../app/api/account/access-check/route';
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
import * as adminBillingOrchestrationSubjectRoute from '../app/api/admin/billing/orchestration/subject/route';
import * as internalBillingOrchestrationRetryRoute from '../app/api/internal/billing/orchestration/retry/route';

const subject = { subjectKind: 'user' as const, subjectId: 'user-1', userId: 'user-1' };

let latestWorkspaceSubjectId: string | null = null;
let blockedFeatures = new Set<string>();
let usageIncremented: string[] = [];

let securityDecisionMode: 'allowed' | 'rate_limited' | 'idempotency_conflict' | 'replayed' = 'allowed';
let securityCompletedCount = 0;
let securityFailedCount = 0;
let securityAuditCount = 0;
let latestSecurityActionKind: string | null = null;

const journalCase = {
  identity: { caseId: 'case-1', subjectKind: 'user' as const, subjectId: subject.subjectId, asset: 'XAU/USD', timeframe: 'H1', title: 'T' }
};

const mockApplicationStateRuntime = {
  journal: {
    listJournalCases: async () => [journalCase],
    createDraftCaseFromReasoningContext: async () => journalCase,
    createDraftCase: async () => journalCase,
    planCase: async () => journalCase,
    markExecuted: async () => journalCase,
    closeCase: async () => journalCase,
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
    updateWatchlistEntry: async () => ({ entryId: 'entry-1' }),
    changeWatchlistStatus: async () => ({ entryId: 'entry-1' }),
    changeWatchlistThesisHealth: async () => ({ entryId: 'entry-1' }),
    archiveWatchlistEntry: async () => ({ entryId: 'entry-1' }),
    listOpenPositions: async () => [],
    createProposedPosition: async () => ({ positionId: 'pos-1' }),
    openPosition: async () => ({ positionId: 'pos-1' }),
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
      if (securityDecisionMode === 'rate_limited') return { decisionId: 'sec-rate', actionKind: 'billing_reconcile', actorKind: 'internal', actorId: 'internal-api', subjectId: 'user-2', status: 'blocked', blockReason: 'rate_limit_exceeded', idempotencyKey: 'idem', rateLimitPolicyKey: 'p', currentCount: 60, maxCount: 60, decidedAt: '2026-01-01T00:00:00.000Z', metadataJson: '{}' };
      if (securityDecisionMode === 'idempotency_conflict') return { decisionId: 'sec-idem', actionKind: 'billing_reconcile', actorKind: 'internal', actorId: 'internal-api', subjectId: 'user-2', status: 'blocked', blockReason: 'idempotency_conflict', idempotencyKey: 'idem', rateLimitPolicyKey: null, currentCount: null, maxCount: null, decidedAt: '2026-01-01T00:00:00.000Z', metadataJson: '{}' };
      if (securityDecisionMode === 'replayed') return { decisionId: 'sec-replay', actionKind: 'billing_orchestration_retry', actorKind: 'internal', actorId: 'internal-api', subjectId: 'user-2', status: 'replayed', blockReason: null, idempotencyKey: 'idem', rateLimitPolicyKey: null, currentCount: null, maxCount: null, decidedAt: '2026-01-01T00:00:00.000Z', metadataJson: '{}' };
      return { decisionId: 'sec-allow', actionKind: 'billing_reconcile', actorKind: 'internal', actorId: 'internal-api', subjectId: 'user-2', status: 'allowed', blockReason: null, idempotencyKey: 'idem', rateLimitPolicyKey: null, currentCount: null, maxCount: null, decidedAt: '2026-01-01T00:00:00.000Z', metadataJson: '{}' };
    },
    completeIdempotentAction: async (_params: { idempotencyKey: string; responseHash: string; nowIso: string }) => { securityCompletedCount += 1; },
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
    registerOrUpdateTarget: async () => ({ targetId: 'target-1' })
  },
  verification: {
    issueTargetVerification: async () => ({ verificationId: 'v-1' }),
    consumeTargetVerification: async () => ({ verified: true }),
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

function installMocks(): void {
  setAuthTestOverrides({ subjectResolver: async () => subject, internalToken: 'internal-token' });
  setCompositionTestOverrides({
    applicationStateRuntime: mockApplicationStateRuntime as never,
    analyticsRuntime: mockAnalyticsRuntime as never,
    notificationRuntime: mockNotificationRuntime as never
  });
}

function clearMocks(): void {
  clearAuthTestOverrides();
  setCompositionTestOverrides(null);
}

function request(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}

async function readJson(response: Response): Promise<{ ok: boolean; [key: string]: unknown }> {
  const payload = await response.json() as { ok: boolean; [key: string]: unknown };
  assert.equal(typeof payload.ok, 'boolean');
  return payload;
}

export async function runRouteRuntimeTests(): Promise<void> {
  installMocks();
  blockedFeatures = new Set();
  usageIncremented = [];
  securityDecisionMode = 'allowed';
  securityCompletedCount = 0;
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
  assert.equal(latestSecurityActionKind, 'journal_case_lifecycle');
  securityDecisionMode = 'rate_limited';
  const journalPlanRateLimited = await journalPlanRoute.POST(request('https://x/api/journal/cases/case-1/plan', { method: 'POST', body: JSON.stringify({ thesis: 'x' }) }), { params: Promise.resolve({ caseId: 'case-1' }) });
  assert.deepEqual(await readJson(journalPlanRateLimited), { ok: false, error: { code: 'bad_request', message: 'Rate limit exceeded', details: ['rate_limit_exceeded'] } });
  securityDecisionMode = 'allowed';
  assert.equal((await readJson(await journalExecuteRoute.POST(request('https://x/api/journal/cases/case-1/execute', { method: 'POST', body: JSON.stringify({ openedAt: '2026-01-01T00:00:00.000Z' }) }), { params: Promise.resolve({ caseId: 'case-1' }) }))).ok, true);
  assert.equal((await readJson(await journalCloseRoute.POST(request('https://x/api/journal/cases/case-1/close', { method: 'POST', body: JSON.stringify({ closedAt: '2026-01-01T00:00:00.000Z', outcome: 'win' }) }), { params: Promise.resolve({ caseId: 'case-1' }) }))).ok, true);
  assert.equal((await readJson(await journalReviewRoute.POST(request('https://x/api/journal/cases/case-1/review', { method: 'POST', body: JSON.stringify({ reviewedAt: '2026-01-01T00:00:00.000Z' }) }), { params: Promise.resolve({ caseId: 'case-1' }) }))).ok, true);
  assert.equal((await readJson(await journalReplayRoute.GET(request('https://x/api/journal/cases/case-1/replay'), { params: Promise.resolve({ caseId: 'case-1' }) }))).ok, true);

  const originalPlanCase = mockApplicationStateRuntime.journal.planCase;
  mockApplicationStateRuntime.journal.planCase = async () => { throw new Error('invalid_transition'); };
  const invalidTransition = await journalPlanRoute.POST(request('https://x/api/journal/cases/case-1/plan', { method: 'POST', body: JSON.stringify({ thesis: 'x' }) }), { params: Promise.resolve({ caseId: 'case-1' }) });
  assert.equal(invalidTransition.status, 422);
  assert.equal((await readJson(invalidTransition)).ok, false);
  mockApplicationStateRuntime.journal.planCase = originalPlanCase;

  assert.equal((await readJson(await watchlistRoute.POST(request('https://x/api/portfolio/watchlist', { method: 'POST', body: JSON.stringify({ asset: 'XAU/USD', timeframe: 'H1', priority: 'high' }) })))).ok, true);
  assert.equal((await readJson(await watchlistEntryRoute.PATCH(request('https://x/api/portfolio/watchlist/entry-1', { method: 'PATCH', body: JSON.stringify({ note: 'n' }) }), { params: Promise.resolve({ entryId: 'entry-1' }) }))).ok, true);
  assert.equal((await readJson(await watchlistStatusRoute.POST(request('https://x/api/portfolio/watchlist/entry-1/status', { method: 'POST', body: JSON.stringify({ status: 'archived' }) }), { params: Promise.resolve({ entryId: 'entry-1' }) }))).ok, true);
  assert.equal((await readJson(await watchlistThesisRoute.POST(request('https://x/api/portfolio/watchlist/entry-1/thesis-health', { method: 'POST', body: JSON.stringify({ thesisHealth: 'weakening' }) }), { params: Promise.resolve({ entryId: 'entry-1' }) }))).ok, true);
  assert.equal((await readJson(await watchlistArchiveRoute.POST(request('https://x/api/portfolio/watchlist/entry-1/archive', { method: 'POST' }), { params: Promise.resolve({ entryId: 'entry-1' }) }))).ok, true);

  assert.equal((await readJson(await positionsRoute.POST(request('https://x/api/portfolio/positions', { method: 'POST', body: JSON.stringify({ asset: 'XAU/USD', timeframe: 'H1', direction: 'long' }) })))).ok, true);
  assert.equal((await readJson(await positionOpenRoute.POST(request('https://x/api/portfolio/positions/pos-1/open', { method: 'POST', body: JSON.stringify({ openedAt: '2026-01-01T00:00:00.000Z' }) }), { params: Promise.resolve({ positionId: 'pos-1' }) }))).ok, true);
  assert.equal((await readJson(await positionCloseRoute.POST(request('https://x/api/portfolio/positions/pos-1/close', { method: 'POST', body: JSON.stringify({ closedAt: '2026-01-01T00:00:00.000Z' }) }), { params: Promise.resolve({ positionId: 'pos-1' }) }))).ok, true);

  assert.equal((await readJson(await actionsRoute.POST(request('https://x/api/portfolio/actions', { method: 'POST', body: JSON.stringify({ kind: 'review_thesis', priority: 'high', headline: 'h', rationale: 'r' }) })))).ok, true);
  assert.equal((await readJson(await actionCompleteRoute.POST(request('https://x/api/portfolio/actions/act-1/complete', { method: 'POST' }), { params: Promise.resolve({ actionId: 'act-1' }) }))).ok, true);
  assert.equal((await readJson(await actionDismissRoute.POST(request('https://x/api/portfolio/actions/act-1/dismiss', { method: 'POST' }), { params: Promise.resolve({ actionId: 'act-1' }) }))).ok, true);
  assert.equal((await readJson(await portfolioSnapshotGenerateRoute.POST(request('https://x/api/portfolio/snapshot/generate', { method: 'POST', headers: { 'Idempotency-Key': 'portfolio-generate-ok' } })))).ok, true);
  assert.equal(usageIncremented.includes('portfolio.snapshot.generate'), true);
  assert.equal((await readJson(await portfolioReplayRoute.GET(request('https://x/api/portfolio/replay?entityKind=position&entityId=pos-1')))).ok, true);

  assert.equal((await readJson(await analyticsLatestRoute.GET(request('https://x/api/analytics/latest')))).ok, true);
  assert.equal((await readJson(await analyticsGenerateRoute.POST(request('https://x/api/analytics/generate', { method: 'POST', headers: { 'Idempotency-Key': 'analytics-generate-ok' } })))).ok, true);
  assert.equal(usageIncremented.includes('analytics.generate'), true);
  assert.equal((await readJson(await coachingGenerateRoute.POST(request('https://x/api/coaching/generate', { method: 'POST', headers: { 'Idempotency-Key': 'coaching-generate-ok' } })))).ok, true);
  assert.equal(usageIncremented.includes('coaching.generate'), true);
  assert.equal((await readJson(await analyticsTopSetupsRoute.GET(request('https://x/api/analytics/top-setups')))).ok, true);
  assert.equal((await readJson(await analyticsTopBehaviorsRoute.GET(request('https://x/api/analytics/top-behaviors')))).ok, true);
  assert.equal((await readJson(await coachingFocusRoute.GET(request('https://x/api/coaching/focus')))).ok, true);
  assert.equal((await readJson(await coachingActionPlanRoute.GET(request('https://x/api/coaching/action-plan')))).ok, true);

  assert.equal((await readJson(await notificationsSummaryRoute.GET())).ok, true);
  assert.equal((await readJson(await notificationsInboxRoute.GET(request('https://x/api/notifications/inbox?limit=5')))).ok, true);
  await notificationsTargetsRoute.POST(request('https://x/api/notifications/targets', { method: 'POST', body: JSON.stringify({ channel: 'email', value: 'a@b.com' }) }));
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
  assert.equal((await readJson(await refreshRunRoute.POST(request('https://x/api/refresh/run', { method: 'POST', body: JSON.stringify({ triggerKind: 'manual' }), headers: { 'Idempotency-Key': 'refresh-run-ok' } })))).ok, true);
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
  assert.equal((await readJson(await adminBillingRenewRoute.POST(request('https://x/api/admin/billing/renew', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2', nextPeriodStart: '2026-02-01T00:00:00.000Z', nextPeriodEnd: '2026-03-01T00:00:00.000Z' }) })))).ok, true);
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

  assert.equal((await readJson(await adminEntitlementPlanRoute.POST(request('https://x/api/admin/entitlements/plan', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'ent-plan-ok' }, body: JSON.stringify({ subjectId: 'user-2', planKind: 'premium' }) })))).ok, true);
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

  assert.deepEqual(await readJson(await internalBillingOrchestrationRetryRoute.POST(request('https://x/api/internal/billing/orchestration/retry', { method: 'POST', body: JSON.stringify({ subjectId: 'user-2' }) }))), { ok: false, error: { code: 'forbidden', message: 'Forbidden' } });
  assert.deepEqual(await readJson(await internalBillingOrchestrationRetryRoute.POST(request('https://x/api/internal/billing/orchestration/retry', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({}) }))), { ok: false, error: { code: 'validation_error', message: 'Validation failed', details: ['subjectId required'] } });
  assert.deepEqual(await readJson(await internalBillingOrchestrationRetryRoute.POST(request('https://x/api/internal/billing/orchestration/retry', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ subjectId: 'user-2' }) }))), { ok: true, data: { run: await mockApplicationStateRuntime.billingOrchestration.runRetryForSubject('user', 'user-2') } });
  securityDecisionMode = 'replayed';
  assert.deepEqual(await readJson(await internalBillingOrchestrationRetryRoute.POST(request('https://x/api/internal/billing/orchestration/retry', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token', 'Idempotency-Key': 'idem-replay' }, body: JSON.stringify({ subjectId: 'user-2' }) }))), { ok: false, error: { code: 'conflict', message: 'Request replayed', details: ['replayed'] } });
  securityDecisionMode = 'allowed';

  clearMocks();
}
