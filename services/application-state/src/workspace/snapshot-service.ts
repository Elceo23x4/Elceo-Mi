import { validateWorkspaceSnapshot } from '@elceo/schemas';
import type {
  AnalyticsSnapshot,
  CanonicalPortfolioSnapshot,
  CoachingSnapshot,
  RecentReasoningSignal,
  WorkspaceAnalyticsSummary,
  WorkspaceCoachingSummary,
  WorkspaceDependencyStatus,
  WorkspaceNotificationSummary,
  WorkspacePortfolioSummary,
  WorkspaceSnapshot,
  WorkspaceSubjectKind,
  WorkspaceSummary
} from '@elceo/types';
import type { PersistedWorkspaceSnapshotRecord, WorkspaceSnapshotRepository } from '../persistence/contracts';
import { createId, nowIso } from '../portfolio/helpers';
import type { WorkspaceDependencyLoaders } from './dependency-contracts';
import { computeNotificationAttentionScore, computeWorkspaceAttention, mapAttentionLevel } from './attention-scoring';
import { generateWorkspaceAgenda } from './agenda-generator';
import { buildWorkspaceSupportingCaseIds } from './supporting-ids';

function defaultDependencyStatus(): WorkspaceDependencyStatus {
  return { portfolio: 'missing', coaching: 'missing', analytics: 'missing', reasoning: 'missing', notifications: 'missing' };
}

function emptyPortfolioSummary(): WorkspacePortfolioSummary {
  return {
    portfolioSnapshotId: null,
    activeWatchlistCount: 0,
    activePositionCount: 0,
    weakeningThesisCount: 0,
    invalidatedThesisCount: 0,
    openActionCount: 0,
    criticalActionCount: 0
  };
}

function emptyCoachingSummary(): WorkspaceCoachingSummary {
  return {
    coachingSnapshotId: null,
    focusAreaCount: 0,
    strengthCount: 0,
    actionPlanCount: 0,
    topFocusHeadline: null,
    topFocusPriority: null,
    topStrengthHeadline: null,
    supportingCaseIds: []
  };
}

function emptyAnalyticsSummary(): WorkspaceAnalyticsSummary {
  return {
    analyticsSnapshotId: null,
    closedCaseCount: 0,
    reviewedCaseCount: 0,
    disciplineScore: null,
    adherenceScore: null,
    topSetupType: null,
    topBehaviorTag: null
  };
}

function emptyNotificationSummary(): WorkspaceNotificationSummary {
  return {
    unreadInboxCount: 0,
    degradedTargetCount: 0,
    criticalReceiptCount: 0,
    providerHealthAttention: 'low'
  };
}

function mapPortfolioSummary(snapshot: CanonicalPortfolioSnapshot | null): WorkspacePortfolioSummary {
  if (!snapshot) return emptyPortfolioSummary();
  return {
    portfolioSnapshotId: snapshot.snapshotId,
    activeWatchlistCount: snapshot.activeWatchlistCount,
    activePositionCount: snapshot.activePositionCount,
    weakeningThesisCount: snapshot.weakeningThesisCount,
    invalidatedThesisCount: snapshot.invalidatedThesisCount,
    openActionCount: snapshot.openActionCount,
    criticalActionCount: snapshot.criticalActionCount
  };
}

function mapCoachingSummary(snapshot: CoachingSnapshot | null): WorkspaceCoachingSummary {
  if (!snapshot) return emptyCoachingSummary();
  const topFocus = [...snapshot.summary.focusAreas].sort((a, b) => b.score - a.score || a.focusId.localeCompare(b.focusId))[0] ?? null;
  const topStrength = [...snapshot.summary.strengths].sort((a, b) => b.score - a.score || a.strengthId.localeCompare(b.strengthId))[0] ?? null;
  return {
    coachingSnapshotId: snapshot.snapshotId,
    focusAreaCount: snapshot.summary.focusAreas.length,
    strengthCount: snapshot.summary.strengths.length,
    actionPlanCount: snapshot.summary.actionPlan.length,
    topFocusHeadline: topFocus?.headline ?? null,
    topFocusPriority: topFocus?.priority ?? null,
    topStrengthHeadline: topStrength?.headline ?? null,
    supportingCaseIds: [...snapshot.summary.supportingCaseIds]
  };
}

function mapAnalyticsSummary(snapshot: AnalyticsSnapshot | null): WorkspaceAnalyticsSummary {
  if (!snapshot) return emptyAnalyticsSummary();
  const topSetup = [...snapshot.summary.setupPatterns].sort((a, b) => b.performanceScore - a.performanceScore || a.setupType.localeCompare(b.setupType))[0] ?? null;
  const topBehavior = [...snapshot.summary.behaviorPatterns].sort((a, b) => b.importanceScore - a.importanceScore || a.behaviorTag.localeCompare(b.behaviorTag))[0] ?? null;
  return {
    analyticsSnapshotId: snapshot.snapshotId,
    closedCaseCount: snapshot.summary.totals.closedCaseCount,
    reviewedCaseCount: snapshot.summary.totals.reviewedCaseCount,
    disciplineScore: snapshot.summary.executionQuality.disciplineScore,
    adherenceScore: snapshot.summary.planAdherence.adherenceScore,
    topSetupType: topSetup?.setupType ?? null,
    topBehaviorTag: topBehavior?.behaviorTag ?? null
  };
}

function mapNotificationSummary(unreadInboxCount: number, degradedTargetCount: number, criticalReceiptCount: number): WorkspaceNotificationSummary {
  const candidate: WorkspaceNotificationSummary = {
    unreadInboxCount,
    degradedTargetCount,
    criticalReceiptCount,
    providerHealthAttention: 'low'
  };
  const score = computeNotificationAttentionScore(candidate);
  return { ...candidate, providerHealthAttention: mapAttentionLevel(score) };
}

function asRecord(snapshot: WorkspaceSnapshot): PersistedWorkspaceSnapshotRecord {
  return {
    snapshotId: snapshot.snapshotId,
    subjectKind: snapshot.summary.subjectKind,
    subjectId: snapshot.summary.subjectId,
    generatedAt: snapshot.summary.generatedAt,
    healthState: snapshot.summary.healthState,
    attentionLevel: snapshot.summary.attentionLevel,
    portfolioSnapshotId: snapshot.summary.portfolio.portfolioSnapshotId,
    coachingSnapshotId: snapshot.summary.coaching.coachingSnapshotId,
    analyticsSnapshotId: snapshot.summary.analytics.analyticsSnapshotId,
    activeWatchlistCount: snapshot.summary.portfolio.activeWatchlistCount,
    activePositionCount: snapshot.summary.portfolio.activePositionCount,
    weakeningThesisCount: snapshot.summary.portfolio.weakeningThesisCount,
    invalidatedThesisCount: snapshot.summary.portfolio.invalidatedThesisCount,
    openActionCount: snapshot.summary.portfolio.openActionCount,
    criticalActionCount: snapshot.summary.portfolio.criticalActionCount,
    unreadInboxCount: snapshot.summary.notifications.unreadInboxCount,
    degradedTargetCount: snapshot.summary.notifications.degradedTargetCount,
    criticalReceiptCount: snapshot.summary.notifications.criticalReceiptCount,
    focusAreaCount: snapshot.summary.coaching.focusAreaCount,
    actionPlanCount: snapshot.summary.coaching.actionPlanCount,
    topFocusPriority: snapshot.summary.coaching.topFocusPriority,
    recentReasoningCount: snapshot.summary.recentReasoningSignals.length,
    agendaJson: JSON.stringify(snapshot.summary.agenda),
    dependencyStatusJson: JSON.stringify(snapshot.summary.dependencyStatus),
    summaryJson: JSON.stringify(snapshot.summary),
    createdAt: snapshot.createdAt
  };
}

export class WorkspaceSnapshotService {
  constructor(private readonly repository: WorkspaceSnapshotRepository, private readonly loaders: WorkspaceDependencyLoaders) {}

  async generateWorkspaceSnapshot(subjectKind: WorkspaceSubjectKind, subjectId: string, generatedAt = nowIso()): Promise<WorkspaceSnapshot> {
    const dependencyStatus = defaultDependencyStatus();

    let portfolioSnapshot: CanonicalPortfolioSnapshot | null = null;
    let coachingSnapshot: CoachingSnapshot | null = null;
    let analyticsSnapshot: AnalyticsSnapshot | null = null;
    let recentReasoningSignals: RecentReasoningSignal[] = [];
    let notificationSummary = emptyNotificationSummary();

    const load = async <T>(key: keyof WorkspaceDependencyStatus, action: () => Promise<T | null>): Promise<T | null> => {
      try {
        const result = await action();
        dependencyStatus[key] = result ? 'loaded' : 'missing';
        return result;
      } catch {
        dependencyStatus[key] = 'failed';
        return null;
      }
    };

    portfolioSnapshot = await load('portfolio', () => this.loaders.portfolio.generatePortfolioSnapshot(subjectKind, subjectId, generatedAt));
    coachingSnapshot = await load('coaching', () => this.loaders.coaching.getLatestCoachingSnapshot(subjectKind, subjectId, '*', '*'));
    analyticsSnapshot = await load('analytics', () => this.loaders.analytics.getLatestAnalyticsSnapshot(subjectKind, subjectId, '*', '*', 180));

    const reasoningLoaded = await load('reasoning', async () => {
      const list = await this.loaders.reasoning.listRecentReasoningSignals(subjectKind, subjectId, 3, generatedAt);
      recentReasoningSignals = [...list].sort((a, b) => Date.parse(b.evaluatedAt) - Date.parse(a.evaluatedAt) || a.reasoningRunId.localeCompare(b.reasoningRunId)).slice(0, 3);
      return list;
    });
    if (!reasoningLoaded) recentReasoningSignals = [];

    const notificationLoaded = await load('notifications', async () => {
      const unread = await this.loaders.notifications.listUnreadInboxCount(subjectKind, subjectId);
      const degraded = await this.loaders.notifications.listDegradedTargetCount(subjectKind, subjectId);
      const critical = await this.loaders.notifications.listRecentCriticalReceiptCount(subjectKind, subjectId, 168);
      notificationSummary = mapNotificationSummary(unread, degraded, critical);
      return { unread, degraded, critical };
    });
    if (!notificationLoaded) notificationSummary = emptyNotificationSummary();

    const portfolio = mapPortfolioSummary(portfolioSnapshot);
    const coaching = mapCoachingSummary(coachingSnapshot);
    const analytics = mapAnalyticsSummary(analyticsSnapshot);

    const attention = computeWorkspaceAttention({
      portfolio,
      coaching,
      notifications: notificationSummary,
      recentReasoningSignals,
      dependencyStatus
    });

    const agenda = generateWorkspaceAgenda({
      subjectKind,
      subjectId,
      generatedAt,
      portfolioSnapshot,
      coachingSnapshot,
      notificationSummary
    });

    const supportingCaseIds = buildWorkspaceSupportingCaseIds(agenda, coaching);

    const summary: WorkspaceSummary = {
      subjectKind,
      subjectId,
      generatedAt,
      healthState: attention.healthState,
      attentionLevel: attention.attentionLevel,
      dependencyStatus,
      portfolio,
      coaching,
      analytics,
      notifications: notificationSummary,
      recentReasoningSignals,
      agenda,
      supportingCaseIds,
      attentionDetail: attention.detail
    };

    const snapshot: WorkspaceSnapshot = {
      snapshotId: createId('wsnap'),
      summary,
      createdAt: nowIso()
    };

    const validated = validateWorkspaceSnapshot(snapshot);
    if (validated.ok === false) throw new Error(`invalid_workspace_snapshot:${validated.errors.join('; ')}`);

    await this.repository.saveSnapshot(asRecord(snapshot));
    return snapshot;
  }
}
