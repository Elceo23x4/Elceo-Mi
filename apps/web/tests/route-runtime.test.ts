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

const subject = { subjectKind: 'user' as const, subjectId: 'user-1', userId: 'user-1' };

let latestWorkspaceSubjectId: string | null = null;

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
    processProviderEvent: async () => ({ accepted: true })
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

  assert.equal((await readJson(await workspaceRefreshRoute.POST(request('https://x/api/workspace/refresh', { method: 'POST', body: JSON.stringify({ triggerKind: 'manual' }) })))).ok, true);
  assert.equal((await readJson(await workspaceFreshnessRoute.GET())).ok, true);

  await workspaceHistoryRoute.GET(request('https://x/api/workspace/history?subjectId=attacker'));
  assert.equal(latestWorkspaceSubjectId, subject.subjectId);

  const historyInvalid = await workspaceHistoryRoute.GET(request('https://x/api/workspace/history?limit=nope'));
  assert.equal(historyInvalid.status, 400);
  assert.equal((await readJson(historyInvalid)).ok, false);
  assert.equal((await readJson(await workspaceAgendaRoute.GET())).ok, true);

  assert.equal((await readJson(await journalCasesRoute.POST(request('https://x/api/journal/cases', { method: 'POST', body: JSON.stringify({ asset: 'XAU/USD', timeframe: 'H1', title: 'draft' }) })))).ok, true);
  assert.equal((await readJson(await journalPlanRoute.POST(request('https://x/api/journal/cases/case-1/plan', { method: 'POST', body: JSON.stringify({ thesis: 'x' }) }), { params: Promise.resolve({ caseId: 'case-1' }) }))).ok, true);
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
  assert.equal((await readJson(await portfolioSnapshotGenerateRoute.POST())).ok, true);
  assert.equal((await readJson(await portfolioReplayRoute.GET(request('https://x/api/portfolio/replay?entityKind=position&entityId=pos-1')))).ok, true);

  assert.equal((await readJson(await analyticsLatestRoute.GET(request('https://x/api/analytics/latest')))).ok, true);
  assert.equal((await readJson(await analyticsGenerateRoute.POST(request('https://x/api/analytics/generate', { method: 'POST' })))).ok, true);
  assert.equal((await readJson(await analyticsTopSetupsRoute.GET(request('https://x/api/analytics/top-setups')))).ok, true);
  assert.equal((await readJson(await analyticsTopBehaviorsRoute.GET(request('https://x/api/analytics/top-behaviors')))).ok, true);
  assert.equal((await readJson(await coachingFocusRoute.GET(request('https://x/api/coaching/focus')))).ok, true);
  assert.equal((await readJson(await coachingActionPlanRoute.GET(request('https://x/api/coaching/action-plan')))).ok, true);

  assert.equal((await readJson(await notificationsSummaryRoute.GET())).ok, true);
  assert.equal((await readJson(await notificationsInboxRoute.GET(request('https://x/api/notifications/inbox?limit=5')))).ok, true);
  assert.equal((await readJson(await notificationsTargetsRoute.POST(request('https://x/api/notifications/targets', { method: 'POST', body: JSON.stringify({ channel: 'email', value: 'a@b.com' }) })))).ok, true);
  assert.equal((await readJson(await notificationsVerificationIssueRoute.POST(request('https://x/api/notifications/verification/issue', { method: 'POST', body: JSON.stringify({ targetId: 'target-1' }) })))).ok, true);
  assert.equal((await readJson(await notificationsVerificationConsumeRoute.POST(request('https://x/api/notifications/verification/consume', { method: 'POST', body: JSON.stringify({ targetId: 'target-1', token: 'abc' }) })))).ok, true);
  assert.equal((await readJson(await notificationsHealthRoute.GET())).ok, true);

  const blockedDispatch = await notificationsDispatchRoute.POST(request('https://x/api/notifications/delivery/dispatch', { method: 'POST' }));
  assert.equal(blockedDispatch.status, 403);
  assert.equal((await readJson(blockedDispatch)).ok, false);
  assert.equal((await readJson(await notificationsDispatchRoute.POST(request('https://x/api/notifications/delivery/dispatch', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);

  assert.equal((await readJson(await refreshLatestRoute.GET())).ok, true);
  assert.equal((await readJson(await refreshHistoryRoute.GET(request('https://x/api/refresh/history?limit=5')))).ok, true);
  assert.equal((await readJson(await refreshFreshnessRoute.GET())).ok, true);
  assert.equal((await readJson(await refreshRunRoute.POST(request('https://x/api/refresh/run', { method: 'POST', body: JSON.stringify({ triggerKind: 'manual' }) })))).ok, true);

  assert.equal((await readJson(await opsExpireRoute.POST(request('https://x/api/ops/notifications/expire-verifications', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.equal((await readJson(await opsFeedbackRoute.POST(request('https://x/api/ops/notifications/process-feedback', { method: 'POST', headers: { 'x-elceo-internal-token': 'internal-token' }, body: JSON.stringify({ providerKind: 'memory', channel: 'email', rawEvent: {} }) })))).ok, true);

  const adminUnauthorized = await adminSystemSummaryRoute.GET(request('https://x/api/admin/system-summary'));
  assert.equal(adminUnauthorized.status, 403);
  assert.equal((await readJson(adminUnauthorized)).ok, false);
  assert.equal((await readJson(await adminSystemSummaryRoute.GET(request('https://x/api/admin/system-summary', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.equal((await readJson(await adminFreshnessRoute.GET(request('https://x/api/admin/freshness', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.equal((await readJson(await adminOpsRoute.GET(request('https://x/api/admin/ops', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.equal((await readJson(await adminProvidersRoute.GET(request('https://x/api/admin/providers', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);
  assert.equal((await readJson(await adminAuditRoute.GET(request('https://x/api/admin/audit?limit=5', { headers: { 'x-elceo-internal-token': 'internal-token' } })))).ok, true);

  clearMocks();
}
