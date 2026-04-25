import { validateSnapshotFreshnessRecord, validateSnapshotRefreshRunReport } from '@elceo/schemas';
import type {
  SnapshotDomainKind,
  SnapshotFreshnessRecord,
  SnapshotRefreshRunReport
} from '@elceo/types';
import {
  MemorySnapshotFreshnessRepository,
  MemorySnapshotRefreshRunRepository
} from '../persistence/refresh-repository';
import { CanonicalRefreshBoundaryService } from '../runtime/canonical-refresh-boundary';
import { getSnapshotDomainDependents } from '../refresh/dependency-graph';
import { evaluateSnapshotFreshness, getMaxFreshMinutesForDomain } from '../refresh/freshness-policy';
import { buildRefreshPlan } from '../refresh/refresh-planner';
import { SnapshotRefreshQueryService } from '../refresh/query-service';
import { SnapshotRefreshService } from '../refresh/refresh-service';
import {
  deserializeSnapshotFreshnessRecord,
  deserializeSnapshotRefreshRunReport,
  serializeSnapshotFreshnessRecord,
  serializeSnapshotRefreshRunReport
} from '../refresh/serialization';
import type { SnapshotRefreshLoaders } from '../refresh/loader-contracts';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function expectThrows(fn: () => unknown, message: string): void {
  let didThrow = false;
  try {
    fn();
  } catch {
    didThrow = true;
  }
  assert(didThrow, message);
}

function buildLoaders(failDomains: Partial<Record<SnapshotDomainKind, boolean>> = {}): SnapshotRefreshLoaders {
  return {
    journalInfluence: {
      async generateJournalInfluenceSnapshot(_subjectKind, subjectId, _assetScope, _timeframeScope, asOfIso) {
        if (failDomains.journal_influence) throw new Error('journal_fail');
        return {
          snapshotId: `jis-${subjectId}`,
          summary: {
            generatedAt: asOfIso ?? '2026-04-25T00:00:00.000Z',
            subjectKind: 'user',
            subjectId,
            asset: '*',
            timeframe: '*',
            reviewedCaseCount: 1,
            closedCaseCount: 1,
            recentCaseCount: 1,
            setupPatterns: [],
            behaviorPatterns: [],
            directionPatterns: [],
            repeatedMistakes: [],
            repeatedStrengths: [],
            cautionNotes: [],
            confidenceBoostNotes: [],
            supportingCaseIds: []
          },
          createdAt: '2026-04-25T00:00:00.000Z'
        };
      }
    },
    analytics: {
      async generateAnalyticsSnapshot(_subjectKind, subjectId, _assetScope, _timeframeScope, _lookbackDays, generatedAt) {
        if (failDomains.analytics) throw new Error('analytics_fail');
        return {
          snapshotId: `an-${subjectId}`,
          createdAt: generatedAt ?? '2026-04-25T00:00:00.000Z',
          summary: {
            window: { subjectKind: 'user', subjectId, assetScope: '*', timeframeScope: '*', lookbackDays: 180, generatedAt: generatedAt ?? '2026-04-25T00:00:00.000Z' },
            totals: { closedCaseCount: 0, reviewedCaseCount: 0, winCount: 0, lossCount: 0, breakevenCount: 0, mixedCount: 0, openCount: 0, linkedReasoningCount: 0, linkedDriftCount: 0, avgRMultiple: null, avgPnlPercent: null, medianRMultiple: null, medianPnlPercent: null, winRate: null, lossRate: null, expectancyR: null },
            setupPatterns: [], directionPatterns: [], executionQuality: { disciplinedCount: 0, acceptableCount: 0, weakCount: 0, impulsiveCount: 0, missingQualityCount: 0, disciplineScore: 0 },
            planAdherence: { comparableEntryCount: 0, avgEntryDeviationPercent: null, maxEntryDeviationPercent: null, adherenceScore: null },
            behaviorPatterns: [], reviewInsights: { repeatedMistakes: [], repeatedStrengths: [], cautionNotes: [], confidenceNotes: [] },
            reasoningLinkSummary: { linkedCaseCount: 0, linkedWinRate: null, linkedAvgRMultiple: null, linkedAvgPnlPercent: null }, supportingCaseIds: []
          }
        };
      }
    },
    coaching: {
      async generateCoachingSnapshot(_subjectKind, subjectId, _assetScope, _timeframeScope, generatedAt) {
        if (failDomains.coaching) throw new Error('coaching_fail');
        return {
          snapshotId: `co-${subjectId}`,
          createdAt: generatedAt ?? '2026-04-25T00:00:00.000Z',
          summary: { subjectKind: 'user', subjectId, assetScope: '*', timeframeScope: '*', generatedAt: generatedAt ?? '2026-04-25T00:00:00.000Z', analyticsSnapshotId: null, journalInfluenceSnapshotId: null, totalSignalsConsidered: 0, focusAreas: [], strengths: [], actionPlan: [], summaryNotes: [], supportingCaseIds: [] }
        };
      }
    },
    portfolio: {
      async generatePortfolioSnapshot(_subjectKind, subjectId, generatedAt) {
        if (failDomains.portfolio) throw new Error('portfolio_fail');
        return { snapshotId: `po-${subjectId}`, subjectKind: 'user', subjectId, generatedAt: generatedAt ?? '2026-04-25T00:00:00.000Z', activeWatchlistCount: 0, activePositionCount: 0, weakeningThesisCount: 0, invalidatedThesisCount: 0, openActionCount: 0, criticalActionCount: 0, watchlistEntries: [], positions: [], actionQueue: [], createdAt: generatedAt ?? '2026-04-25T00:00:00.000Z' };
      }
    },
    workspace: {
      async generateWorkspaceSnapshot(_subjectKind, subjectId, generatedAt) {
        if (failDomains.workspace) throw new Error('workspace_fail');
        return {
          snapshotId: `ws-${subjectId}`,
          createdAt: generatedAt ?? '2026-04-25T00:00:00.000Z',
          summary: {
            subjectKind: 'user', subjectId, generatedAt: generatedAt ?? '2026-04-25T00:00:00.000Z', healthState: 'stable', attentionLevel: 'low',
            dependencyStatus: { portfolio: 'loaded', coaching: 'loaded', analytics: 'loaded', reasoning: 'missing', notifications: 'missing' },
            portfolio: { portfolioSnapshotId: null, activeWatchlistCount: 0, activePositionCount: 0, weakeningThesisCount: 0, invalidatedThesisCount: 0, openActionCount: 0, criticalActionCount: 0 },
            coaching: { coachingSnapshotId: null, focusAreaCount: 0, strengthCount: 0, actionPlanCount: 0, topFocusHeadline: null, topFocusPriority: null, topStrengthHeadline: null, supportingCaseIds: [] },
            analytics: { analyticsSnapshotId: null, closedCaseCount: 0, reviewedCaseCount: 0, disciplineScore: null, adherenceScore: null, topSetupType: null, topBehaviorTag: null },
            notifications: { unreadInboxCount: 0, degradedTargetCount: 0, criticalReceiptCount: 0, providerHealthAttention: 'low' },
            recentReasoningSignals: [], agenda: [], supportingCaseIds: [], attentionDetail: { portfolioAttentionScore: 0, coachingAttentionScore: 0, notificationAttentionScore: 0, reasoningAttentionScore: 0, dependencyPenaltyApplied: 0 }
          }
        };
      }
    }
  };
}

export async function runSnapshotRefreshRuntimeTests(): Promise<void> {
  const runRepo = new MemorySnapshotRefreshRunRepository();
  const freshnessRepo = new MemorySnapshotFreshnessRepository();

  // A. validation / serialization
  const validReport: SnapshotRefreshRunReport = {
    refreshRunId: 'run-1', subjectKind: 'user', subjectId: 'u1', triggerKind: 'manual', generatedAt: '2026-04-25T00:00:00.000Z', overallStatus: 'success',
    domainResults: [{ domain: 'workspace', status: 'success', previousFreshnessState: null, nextFreshnessState: 'fresh', snapshotId: 'ws-1', startedAt: '2026-04-25T00:00:00.000Z', endedAt: '2026-04-25T00:00:01.000Z', durationMs: 1, dependencyStatus: { coaching: 'satisfied' }, warnings: [], failureReason: null }],
    refreshedDomains: ['workspace'], failedDomains: [], staleDomains: [], warnings: [], createdAt: '2026-04-25T00:00:00.000Z'
  };
  const parsedReport = deserializeSnapshotRefreshRunReport(serializeSnapshotRefreshRunReport(validReport));
  assert(parsedReport.refreshRunId === 'run-1', 'valid refresh run deserialize');
  expectThrows(() => deserializeSnapshotRefreshRunReport('{"bad":'), 'malformed refresh JSON deterministic failure');

  const validFreshness: SnapshotFreshnessRecord = {
    freshnessId: 'f1', domain: 'workspace', subjectKind: 'user', subjectId: 'u1', assetScope: '*', timeframeScope: '*', latestSnapshotId: 'ws-1', freshnessState: 'fresh', dependencyState: 'satisfied', snapshotGeneratedAt: '2026-04-25T00:00:00.000Z', evaluatedAt: '2026-04-25T00:10:00.000Z', ageMinutes: 10, maxFreshMinutes: 120, failureReason: null, updatedAt: '2026-04-25T00:10:00.000Z'
  };
  const parsedFreshness = deserializeSnapshotFreshnessRecord(serializeSnapshotFreshnessRecord(validFreshness));
  assert(parsedFreshness.freshnessId === 'f1', 'valid freshness deserialize');
  expectThrows(() => deserializeSnapshotFreshnessRecord('{"bad":'), 'malformed freshness JSON deterministic failure');
  assert(validateSnapshotRefreshRunReport(parsedReport).ok, 'report validator accepts valid');
  assert(validateSnapshotFreshnessRecord(parsedFreshness).ok, 'freshness validator accepts valid');

  // B. freshness policy
  assert(getMaxFreshMinutesForDomain('workspace') === 120 && getMaxFreshMinutesForDomain('portfolio') === 240, 'maxFreshMinutes exact by domain');
  assert(evaluateSnapshotFreshness({ domain: 'workspace', latestSnapshotGeneratedAt: null, evaluatedAt: '2026-04-25T01:00:00.000Z', lastRefreshFailed: false, dependencyState: 'satisfied' }).freshnessState === 'missing', 'missing evaluation exact');
  assert(evaluateSnapshotFreshness({ domain: 'workspace', latestSnapshotGeneratedAt: '2026-04-25T00:00:00.000Z', evaluatedAt: '2026-04-25T01:00:00.000Z', lastRefreshFailed: false, dependencyState: 'satisfied' }).freshnessState === 'fresh', 'fresh evaluation exact');
  assert(evaluateSnapshotFreshness({ domain: 'workspace', latestSnapshotGeneratedAt: '2026-04-24T00:00:00.000Z', evaluatedAt: '2026-04-25T01:00:00.000Z', lastRefreshFailed: false, dependencyState: 'satisfied' }).freshnessState === 'stale', 'stale evaluation exact');
  const failedEval = evaluateSnapshotFreshness({ domain: 'workspace', latestSnapshotGeneratedAt: '2026-04-25T00:00:00.000Z', evaluatedAt: '2026-04-25T01:00:00.000Z', lastRefreshFailed: true, dependencyState: 'satisfied' });
  assert(failedEval.freshnessState === 'failed', 'failed evaluation exact');
  assert(evaluateSnapshotFreshness({ domain: 'workspace', latestSnapshotGeneratedAt: '2026-04-25T00:00:00.000Z', evaluatedAt: '2026-04-25T00:30:00.000Z', lastRefreshFailed: false, dependencyState: 'satisfied' }).ageMinutes === 30, 'ageMinutes calculation exact');

  // C. planning
  await freshnessRepo.upsertFreshness({ ...validFreshness, domain: 'workspace', freshnessState: 'stale' });
  const scheduled = buildRefreshPlan('user', 'u1', 'scheduled', '2026-04-25T01:00:00.000Z', await freshnessRepo.listFreshnessForSubject('user', 'u1'));
  assert(scheduled.plannedDomains.includes('workspace'), 'scheduled trigger stale/missing selection exact');
  assert(getSnapshotDomainDependents('journal_influence').includes('coaching'), 'downstream expansion exact');
  const manual = buildRefreshPlan('user', 'u1', 'manual', '2026-04-25T01:00:00.000Z', []);
  assert(manual.plannedDomains.join(',') === 'journal_influence,analytics,coaching,portfolio,workspace', 'manual trigger all domains exact');
  const reasoning = buildRefreshPlan('user', 'u1', 'reasoning_completed', '2026-04-25T01:00:00.000Z', []);
  const feedback = buildRefreshPlan('user', 'u1', 'notification_feedback', '2026-04-25T01:00:00.000Z', []);
  assert(reasoning.plannedDomains.join(',') === 'workspace' && feedback.plannedDomains.join(',') === 'workspace', 'reasoning/notification workspace only exact');

  // D. execution service
  const service = new SnapshotRefreshService(buildLoaders(), runRepo, freshnessRepo);
  const successRun = await service.runSnapshotRefresh('user', 'u1', 'manual', '2026-04-25T02:00:00.000Z');
  assert(successRun.overallStatus === 'success', 'successful multi-domain refresh exact');

  const partialService = new SnapshotRefreshService(buildLoaders({ coaching: true }), runRepo, freshnessRepo);
  const partialRun = await partialService.runSnapshotRefresh('user', 'u2', 'manual', '2026-04-25T02:00:00.000Z');
  assert(partialRun.overallStatus === 'partial_success', 'partial failure exact');
  const workspaceResult = partialRun.domainResults.find((row) => row.domain === 'workspace');
  assert(workspaceResult?.status === 'success', 'workspace still refreshes with upstream failed dependency status recorded');
  assert((workspaceResult?.warnings ?? []).includes('workspace_refreshed_with_degraded_dependencies'), 'warnings behavior exact');
  const coachingResult = partialRun.domainResults.find((row) => row.domain === 'coaching');
  assert(coachingResult?.failureReason === 'coaching_fail', 'failureReason behavior exact');
  assert((await runRepo.getRunById(partialRun.refreshRunId)) !== null, 'persisted run exact');
  assert((await freshnessRepo.listFreshnessForSubject('user', 'u2')).length > 0, 'freshness updates exact');

  // E. freshness attention summary
  const query = new SnapshotRefreshQueryService(runRepo, freshnessRepo);
  const summary = await query.getRefreshAttentionSummary('user', 'u2');
  assert(summary.overallFreshnessState === 'failed', 'overallFreshnessState mapping exact');
  assert(summary.mostCriticalDomain === 'workspace', 'mostCriticalDomain ordering exact');

  // F. replay/query
  const latest = await query.getLatestSnapshotRefreshRun('user', 'u2');
  assert(latest?.refreshRunId === partialRun.refreshRunId, 'latest run selection exact');
  const freshnessRows = await query.listSnapshotFreshnessForSubject('user', 'u2');
  assert(freshnessRows.length >= 5, 'freshness listing exact');
  const needing = await query.listDomainsNeedingRefresh('user', 'u2');
  assert(needing[0]?.freshnessState === 'failed', 'domains needing refresh ordering exact');

  // G. boundary
  const boundary = new CanonicalRefreshBoundaryService(buildLoaders(), runRepo, freshnessRepo);
  const fromBoundary = await boundary.runManualFullRefresh('user', 'u3', '2026-04-25T03:00:00.000Z');
  assert(fromBoundary.overallStatus === 'success', 'canonical refresh boundary methods work end-to-end');
  const statusSummary = await boundary.getRefreshRunStatusSummary('user', 'u3');
  assert(statusSummary.latestRunStatus === 'success', 'boundary status summary helper works');
}
