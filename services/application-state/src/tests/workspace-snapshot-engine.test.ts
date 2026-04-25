import { validateWorkspaceSnapshot } from '@elceo/schemas';
import type { AnalyticsSnapshot, CanonicalPortfolioSnapshot, CoachingSnapshot, RecentReasoningSignal } from '@elceo/types';
import { MemoryWorkspaceSnapshotRepository } from '../persistence/workspace-repository';
import { computeCoachingAttentionScore, computeDependencyPenalty, computeNotificationAttentionScore, computePortfolioAttentionScore, computeReasoningAttentionScore, mapAttentionLevel, mapHealthState } from '../workspace/attention-scoring';
import { generateWorkspaceAgenda } from '../workspace/agenda-generator';
import { buildWorkspaceSupportingCaseIds } from '../workspace/supporting-ids';
import { WorkspaceSnapshotService } from '../workspace/snapshot-service';
import { deserializeWorkspaceSnapshot, serializeWorkspaceSnapshot } from '../workspace/serialization';
import { getLatestWorkspaceSnapshotReplay, getWorkspaceSnapshotReplayById, listWorkspaceSnapshotReplays } from '../workspace/replay';
import { WorkspaceQueryService } from '../workspace/query-service';
import { CanonicalWorkspaceBoundaryService } from '../runtime/canonical-workspace-boundary';
import type { WorkspaceDependencyLoaders } from '../workspace/dependency-contracts';

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

function createPortfolioSnapshot(): CanonicalPortfolioSnapshot {
  return {
    snapshotId: 'ps-1',
    subjectKind: 'user',
    subjectId: 'u-1',
    generatedAt: '2026-04-25T10:00:00.000Z',
    activeWatchlistCount: 2,
    activePositionCount: 1,
    weakeningThesisCount: 1,
    invalidatedThesisCount: 1,
    openActionCount: 2,
    criticalActionCount: 1,
    watchlistEntries: [
      {
        entryId: 'w-1',
        subjectKind: 'user',
        subjectId: 'u-1',
        asset: 'XAU/USD',
        timeframe: 'H1',
        priority: 'high',
        status: 'watching',
        thesisHealth: 'invalidated',
        note: null,
        linkedReasoningRunId: 'run-4',
        linkedSnapshotId: 'snap-4',
        linkedDriftId: null,
        linkedJournalCaseId: 'case-3',
        createdAt: '2026-04-25T08:00:00.000Z',
        updatedAt: '2026-04-25T08:00:00.000Z'
      }
    ],
    positions: [
      {
        positionId: 'p-1',
        subjectKind: 'user',
        subjectId: 'u-1',
        asset: 'BTC/USD',
        timeframe: 'M15',
        status: 'open',
        direction: 'long',
        entryPrice: 95000,
        stopLoss: 94200,
        takeProfitLevels: [96000],
        size: 0.4,
        openedAt: '2026-04-25T09:00:00.000Z',
        updatedAt: '2026-04-25T09:10:00.000Z',
        closedAt: null,
        thesisHealth: 'weakening',
        linkedJournalCaseId: 'case-9',
        linkedReasoningRunId: 'run-9',
        linkedSnapshotId: 'snap-9',
        linkedDriftId: null,
        note: null
      }
    ],
    actionQueue: [
      {
        actionId: 'a-1',
        subjectKind: 'user',
        subjectId: 'u-1',
        kind: 'review_thesis',
        status: 'open',
        priority: 'critical',
        asset: 'BTC/USD',
        timeframe: 'M15',
        headline: 'Review thesis now.',
        rationale: 'Contradiction rose.',
        linkedEntryId: null,
        linkedPositionId: 'p-1',
        linkedJournalCaseId: 'case-9',
        linkedReasoningRunId: 'run-9',
        linkedNotificationDecisionId: 'nd-1',
        createdAt: '2026-04-25T09:11:00.000Z',
        updatedAt: '2026-04-25T09:11:00.000Z',
        completedAt: null,
        dismissedAt: null
      },
      {
        actionId: 'a-2',
        subjectKind: 'user',
        subjectId: 'u-1',
        kind: 'update_journal',
        status: 'open',
        priority: 'medium',
        asset: null,
        timeframe: null,
        headline: 'Write post-trade note.',
        rationale: 'Capture behavior.',
        linkedEntryId: null,
        linkedPositionId: null,
        linkedJournalCaseId: null,
        linkedReasoningRunId: null,
        linkedNotificationDecisionId: null,
        createdAt: '2026-04-25T09:12:00.000Z',
        updatedAt: '2026-04-25T09:12:00.000Z',
        completedAt: null,
        dismissedAt: null
      }
    ],
    createdAt: '2026-04-25T10:00:00.000Z'
  };
}

function createCoachingSnapshot(): CoachingSnapshot {
  return {
    snapshotId: 'cs-1',
    createdAt: '2026-04-25T09:59:00.000Z',
    summary: {
      subjectKind: 'user',
      subjectId: 'u-1',
      assetScope: '*',
      timeframeScope: '*',
      generatedAt: '2026-04-25T09:59:00.000Z',
      analyticsSnapshotId: 'as-1',
      journalInfluenceSnapshotId: 'jis-1',
      totalSignalsConsidered: 12,
      focusAreas: [
        {
          focusId: 'f-1', theme: 'discipline', priority: 'high', headline: 'Tighten discipline', explanation: 'Pattern drift', supportingMetrics: { risk: 65 }, supportingCaseIds: ['case-9', 'case-3'], sourceKinds: ['analytics'], score: 70
        },
        {
          focusId: 'f-2', theme: 'execution_precision', priority: 'medium', headline: 'Improve entries', explanation: 'Deviation too wide', supportingMetrics: { adherence: 42 }, supportingCaseIds: ['case-3'], sourceKinds: ['analytics'], score: 55
        }
      ],
      strengths: [
        { strengthId: 's-1', theme: 'behavior_control', headline: 'Patience improved', explanation: 'Fewer impulsive exits', supportingCaseIds: ['case-2'], score: 61 }
      ],
      actionPlan: [
        { actionId: 'cact-1', theme: 'discipline', priority: 'high', instruction: 'Use pre-entry checklist', successMetric: '5 sessions', supportingFocusIds: ['f-1'], score: 70 }
      ],
      summaryNotes: ['Primary coaching priority: Tighten discipline'],
      supportingCaseIds: ['case-9', 'case-3', 'case-2']
    }
  };
}

function createAnalyticsSnapshot(): AnalyticsSnapshot {
  return {
    snapshotId: 'as-1',
    createdAt: '2026-04-25T09:58:00.000Z',
    summary: {
      window: { subjectKind: 'user', subjectId: 'u-1', assetScope: '*', timeframeScope: '*', lookbackDays: 180, generatedAt: '2026-04-25T09:58:00.000Z' },
      totals: { closedCaseCount: 8, reviewedCaseCount: 7, winCount: 5, lossCount: 2, breakevenCount: 1, mixedCount: 0, openCount: 0, linkedReasoningCount: 3, linkedDriftCount: 1, avgRMultiple: 1.2, avgPnlPercent: 2.1, medianRMultiple: 1.0, medianPnlPercent: 1.8, winRate: 0.62, lossRate: 0.25, expectancyR: 0.7 },
      setupPatterns: [{ setupType: 'breakout', sampleCount: 4, winCount: 3, lossCount: 1, breakevenCount: 0, mixedCount: 0, avgRMultiple: 1.4, avgPnlPercent: 2.4, winRate: 0.75, expectancyR: 1.1, disciplineScore: 72, performanceScore: 74 }],
      directionPatterns: [{ direction: 'long', sampleCount: 5, avgRMultiple: 1.2, avgPnlPercent: 2.0, winRate: 0.6, performanceScore: 66 }],
      executionQuality: { disciplinedCount: 3, acceptableCount: 2, weakCount: 1, impulsiveCount: 1, missingQualityCount: 0, disciplineScore: 68 },
      planAdherence: { comparableEntryCount: 7, avgEntryDeviationPercent: 3.2, maxEntryDeviationPercent: 8.1, adherenceScore: 74 },
      behaviorPatterns: [{ behaviorTag: 'late_entry', sampleCount: 3, winAssociationScore: 18, lossAssociationScore: 44, impulsiveAssociationScore: 37, importanceScore: 49 }],
      reviewInsights: { repeatedMistakes: ['late_entry'], repeatedStrengths: [], cautionNotes: ['Execution timing slipping.'], confidenceNotes: [] },
      reasoningLinkSummary: { linkedCaseCount: 3, linkedWinRate: 0.66, linkedAvgRMultiple: 1.1, linkedAvgPnlPercent: 2.0 },
      supportingCaseIds: ['case-9', 'case-3']
    }
  };
}

export async function runWorkspaceSnapshotEngineTests(): Promise<void> {
  const repo = new MemoryWorkspaceSnapshotRepository();

  const reasoningSignals: RecentReasoningSignal[] = [
    { reasoningRunId: 'run-2', snapshotId: 'snap-2', asset: 'BTC/USD', timeframe: 'M15', bias: 'bullish', confidenceScore: 58, contradictionScore: 72, freshnessScore: 80, evaluatedAt: '2026-04-25T09:20:00.000Z' },
    { reasoningRunId: 'run-1', snapshotId: 'snap-1', asset: 'XAU/USD', timeframe: 'H1', bias: 'neutral', confidenceScore: 84, contradictionScore: 30, freshnessScore: 95, evaluatedAt: '2026-04-25T09:40:00.000Z' }
  ];

  const loaders: WorkspaceDependencyLoaders = {
    portfolio: { generatePortfolioSnapshot: async () => createPortfolioSnapshot() },
    coaching: { getLatestCoachingSnapshot: async () => createCoachingSnapshot() },
    analytics: { getLatestAnalyticsSnapshot: async () => createAnalyticsSnapshot() },
    reasoning: { listRecentReasoningSignals: async () => reasoningSignals },
    notifications: {
      listUnreadInboxCount: async () => 4,
      listDegradedTargetCount: async () => 1,
      listRecentCriticalReceiptCount: async () => 2
    }
  };

  const service = new WorkspaceSnapshotService(repo, loaders);
  const snapshot = await service.generateWorkspaceSnapshot('user', 'u-1', '2026-04-25T10:00:00.000Z');
  assert(validateWorkspaceSnapshot(snapshot).ok, 'workspace snapshot must validate');

  const serialized = serializeWorkspaceSnapshot(snapshot);
  const roundTrip = deserializeWorkspaceSnapshot(serialized);
  assert(roundTrip.summary.subjectId === 'u-1', 'workspace snapshot should round trip');
  expectThrows(() => deserializeWorkspaceSnapshot('{bad'), 'malformed json should fail deterministically');

  const replayById = await getWorkspaceSnapshotReplayById(snapshot.snapshotId, repo);
  assert(replayById?.snapshot.snapshotId === snapshot.snapshotId, 'replay by id should load record + snapshot');
  const replayLatest = await getLatestWorkspaceSnapshotReplay('user', 'u-1', repo);
  assert(replayLatest?.snapshot.snapshotId === snapshot.snapshotId, 'latest replay should return snapshot');
  const replayList = await listWorkspaceSnapshotReplays('user', 'u-1', repo, 10);
  assert(replayList.length === 1, 'replay list should return persisted snapshots');

  assert(computePortfolioAttentionScore(snapshot.summary.portfolio) === 75, 'portfolio attention formula must match');
  assert(computeCoachingAttentionScore(snapshot.summary.coaching) === 65, 'coaching attention formula must match');
  assert(computeNotificationAttentionScore(snapshot.summary.notifications) === 56, 'notification attention formula must match');
  assert(computeReasoningAttentionScore(reasoningSignals) === 55.6, 'reasoning attention formula must match');
  assert(computeDependencyPenalty(snapshot.summary.dependencyStatus) === 0, 'dependency penalty formula must match');
  assert(mapAttentionLevel(79) === 'high' && mapHealthState('high') === 'attention_needed', 'attention/health mapping must match');

  const agenda = generateWorkspaceAgenda({
    subjectKind: 'user',
    subjectId: 'u-1',
    generatedAt: '2026-04-25T10:00:00.000Z',
    portfolioSnapshot: createPortfolioSnapshot(),
    coachingSnapshot: createCoachingSnapshot(),
    notificationSummary: snapshot.summary.notifications
  });
  assert(agenda.length <= 10, 'agenda should cap at 10');
  assert(agenda[0]?.agendaId === 'agenda|portfolio_action|user|u-1|2026-04-25T10:00:00.000Z|1', 'agenda id must be deterministic');
  assert(agenda.some((item) => item.sourceKind === 'portfolio_action'), 'agenda should include portfolio items');
  assert(agenda.some((item) => item.sourceKind === 'coaching_focus'), 'agenda should include coaching items');
  assert(agenda.some((item) => item.sourceKind === 'notification'), 'agenda should include notification items');
  assert(!agenda.some((item, index) => agenda.findIndex((x) => x.headline === item.headline && x.sourceKind === item.sourceKind && x.linkedActionId === item.linkedActionId) !== index), 'agenda should dedupe duplicate keys');

  const union = buildWorkspaceSupportingCaseIds(agenda, snapshot.summary.coaching);
  assert(union.length <= 50, 'supporting ids cap should apply');
  assert(union[0] === 'case-9', 'supporting ids should preserve order');

  const query = new WorkspaceQueryService(repo);
  const latest = await query.getLatestWorkspaceSnapshot('user', 'u-1');
  assert(latest?.snapshotId === snapshot.snapshotId, 'latest query should use persisted latest snapshot');
  const attention = await query.getCurrentWorkspaceAttentionSummary('user', 'u-1');
  assert(attention?.portfolioAttentionScore === 75, 'attention summary should come from persisted snapshot only');
  const currentAgenda = await query.getCurrentWorkspaceAgenda('user', 'u-1');
  assert(currentAgenda.length > 0, 'current agenda should come from latest persisted snapshot');

  const degradedLoaders: WorkspaceDependencyLoaders = {
    ...loaders,
    coaching: { getLatestCoachingSnapshot: async () => { throw new Error('boom'); } },
    analytics: { getLatestAnalyticsSnapshot: async () => null }
  };
  const degradedService = new WorkspaceSnapshotService(repo, degradedLoaders);
  const degradedSnapshot = await degradedService.generateWorkspaceSnapshot('workspace', 'ws-1', '2026-04-25T11:00:00.000Z');
  assert(degradedSnapshot.summary.dependencyStatus.coaching === 'failed', 'failed dependency should be marked failed');
  assert(degradedSnapshot.summary.dependencyStatus.analytics === 'missing', 'missing dependency should be marked missing');
  assert(degradedSnapshot.summary.coaching.coachingSnapshotId === null, 'missing/failed dependencies should use safe defaults');

  const boundary = new CanonicalWorkspaceBoundaryService(repo, loaders);
  const generated = await boundary.generateWorkspaceSnapshot('ops', 'ops-1', '2026-04-25T12:00:00.000Z');
  assert(Boolean((await boundary.getWorkspaceSnapshot(generated.snapshotId))?.snapshotId), 'boundary get by id should work');
  assert((await boundary.listWorkspaceSnapshots('ops', 'ops-1', 10)).length === 1, 'boundary list should work');
  assert((await boundary.getCurrentWorkspaceAgenda('ops', 'ops-1')).length > 0, 'boundary current agenda should work');
  assert(Boolean(await boundary.getCurrentWorkspaceAttentionSummary('ops', 'ops-1')), 'boundary attention summary should work');
  assert(Boolean(await boundary.getWorkspaceDependencyStatus('ops', 'ops-1')), 'boundary dependency helper should work');
}
