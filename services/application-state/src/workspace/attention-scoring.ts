import type {
  RecentReasoningSignal,
  WorkspaceAttentionDetail,
  WorkspaceAttentionLevel,
  WorkspaceCoachingSummary,
  WorkspaceDependencyStatus,
  WorkspaceHealthState,
  WorkspaceNotificationSummary,
  WorkspacePortfolioSummary
} from '@elceo/types';

function clampTo100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

export function computePortfolioAttentionScore(summary: WorkspacePortfolioSummary): number {
  const base = summary.invalidatedThesisCount * 30 + summary.weakeningThesisCount * 12 + summary.criticalActionCount * 25 + Math.max(0, summary.openActionCount - summary.criticalActionCount) * 8;
  return clampTo100(base);
}

export function computeCoachingAttentionScore(summary: WorkspaceCoachingSummary): number {
  if (summary.topFocusPriority === 'critical') return 85;
  if (summary.topFocusPriority === 'high') return 65;
  if (summary.topFocusPriority === 'medium') return 45;
  if (summary.topFocusPriority === 'low') return 20;
  return 0;
}

export function computeNotificationAttentionScore(summary: WorkspaceNotificationSummary): number {
  const base = Math.min(30, summary.unreadInboxCount * 4) + Math.min(30, summary.degradedTargetCount * 20) + Math.min(40, summary.criticalReceiptCount * 10);
  return clampTo100(base);
}

export function computeReasoningAttentionScore(signals: RecentReasoningSignal[]): number {
  if (signals.length === 0) return 0;
  const maxScore = signals.reduce((best, signal) => {
    const freshnessPenalty = signal.freshnessScore === null ? 0 : (100 - signal.freshnessScore);
    const candidate = signal.contradictionScore * 0.6 + (100 - signal.confidenceScore) * 0.2 + freshnessPenalty * 0.2;
    return Math.max(best, candidate);
  }, 0);
  return clampTo100(maxScore);
}

export function computeDependencyPenalty(dependencyStatus: WorkspaceDependencyStatus): number {
  const failed = Object.values(dependencyStatus).filter((value) => value === 'failed').length;
  if (failed >= 2) return 20;
  if (failed === 1) return 10;
  return 0;
}

export function mapAttentionLevel(score: number): WorkspaceAttentionLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function mapHealthState(attentionLevel: WorkspaceAttentionLevel): WorkspaceHealthState {
  if (attentionLevel === 'critical') return 'critical';
  if (attentionLevel === 'high' || attentionLevel === 'medium') return 'attention_needed';
  return 'stable';
}

export function computeWorkspaceAttention(input: {
  portfolio: WorkspacePortfolioSummary;
  coaching: WorkspaceCoachingSummary;
  notifications: WorkspaceNotificationSummary;
  recentReasoningSignals: RecentReasoningSignal[];
  dependencyStatus: WorkspaceDependencyStatus;
}): { attentionLevel: WorkspaceAttentionLevel; healthState: WorkspaceHealthState; detail: WorkspaceAttentionDetail } {
  const detail: WorkspaceAttentionDetail = {
    portfolioAttentionScore: computePortfolioAttentionScore(input.portfolio),
    coachingAttentionScore: computeCoachingAttentionScore(input.coaching),
    notificationAttentionScore: computeNotificationAttentionScore(input.notifications),
    reasoningAttentionScore: computeReasoningAttentionScore(input.recentReasoningSignals),
    dependencyPenaltyApplied: computeDependencyPenalty(input.dependencyStatus)
  };

  const base = Math.max(detail.portfolioAttentionScore, detail.coachingAttentionScore, detail.notificationAttentionScore, detail.reasoningAttentionScore);
  const finalScore = clampTo100(base + detail.dependencyPenaltyApplied);
  const attentionLevel = mapAttentionLevel(finalScore);

  return {
    attentionLevel,
    healthState: mapHealthState(attentionLevel),
    detail
  };
}
