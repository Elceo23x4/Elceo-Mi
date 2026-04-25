import type { BiasState, CanonicalAssetSymbol, Timeframe } from './events';
import type { CoachingPriority } from './coaching';

export type WorkspaceHealthState = 'stable' | 'attention_needed' | 'critical';

export type WorkspaceAttentionLevel = 'low' | 'medium' | 'high' | 'critical';

export type WorkspaceSourceStatus = 'loaded' | 'missing' | 'stale' | 'failed';

export type WorkspaceSubjectKind = 'user' | 'workspace' | 'ops';

export type RecentReasoningSignal = {
  reasoningRunId: string;
  snapshotId: string | null;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  bias: BiasState;
  confidenceScore: number;
  contradictionScore: number;
  freshnessScore: number | null;
  evaluatedAt: string;
};

export type WorkspacePortfolioSummary = {
  portfolioSnapshotId: string | null;
  activeWatchlistCount: number;
  activePositionCount: number;
  weakeningThesisCount: number;
  invalidatedThesisCount: number;
  openActionCount: number;
  criticalActionCount: number;
};

export type WorkspaceCoachingSummary = {
  coachingSnapshotId: string | null;
  focusAreaCount: number;
  strengthCount: number;
  actionPlanCount: number;
  topFocusHeadline: string | null;
  topFocusPriority: CoachingPriority | null;
  topStrengthHeadline: string | null;
  supportingCaseIds: string[];
};

export type WorkspaceAnalyticsSummary = {
  analyticsSnapshotId: string | null;
  closedCaseCount: number;
  reviewedCaseCount: number;
  disciplineScore: number | null;
  adherenceScore: number | null;
  topSetupType: string | null;
  topBehaviorTag: string | null;
};

export type WorkspaceNotificationSummary = {
  unreadInboxCount: number;
  degradedTargetCount: number;
  criticalReceiptCount: number;
  providerHealthAttention: WorkspaceAttentionLevel;
};

export type WorkspaceAgendaSourceKind =
  | 'portfolio_action'
  | 'coaching_focus'
  | 'notification'
  | 'reasoning'
  | 'thesis_health';

export type WorkspaceAgendaItem = {
  agendaId: string;
  sourceKind: WorkspaceAgendaSourceKind;
  priority: WorkspaceAttentionLevel;
  headline: string;
  rationale: string;
  linkedActionId: string | null;
  linkedFocusId: string | null;
  linkedNotificationDecisionId: string | null;
  linkedReasoningRunId: string | null;
  linkedPositionId: string | null;
  linkedWatchlistEntryId: string | null;
  supportingCaseIds: string[];
  score: number;
};

export type WorkspaceDependencyStatus = {
  portfolio: WorkspaceSourceStatus;
  coaching: WorkspaceSourceStatus;
  analytics: WorkspaceSourceStatus;
  reasoning: WorkspaceSourceStatus;
  notifications: WorkspaceSourceStatus;
};

export type WorkspaceAttentionDetail = {
  portfolioAttentionScore: number;
  coachingAttentionScore: number;
  notificationAttentionScore: number;
  reasoningAttentionScore: number;
  dependencyPenaltyApplied: number;
};

export type WorkspaceSummary = {
  subjectKind: WorkspaceSubjectKind;
  subjectId: string;
  generatedAt: string;
  healthState: WorkspaceHealthState;
  attentionLevel: WorkspaceAttentionLevel;
  dependencyStatus: WorkspaceDependencyStatus;
  portfolio: WorkspacePortfolioSummary;
  coaching: WorkspaceCoachingSummary;
  analytics: WorkspaceAnalyticsSummary;
  notifications: WorkspaceNotificationSummary;
  recentReasoningSignals: RecentReasoningSignal[];
  agenda: WorkspaceAgendaItem[];
  supportingCaseIds: string[];
  attentionDetail: WorkspaceAttentionDetail;
};

export type WorkspaceSnapshot = {
  snapshotId: string;
  summary: WorkspaceSummary;
  createdAt: string;
};
