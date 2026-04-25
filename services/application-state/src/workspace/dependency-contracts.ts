import type {
  AnalyticsSnapshot,
  CoachingSnapshot,
  RecentReasoningSignal,
  CanonicalPortfolioSnapshot,
  WorkspaceSourceStatus,
  WorkspaceSubjectKind
} from '@elceo/types';

export type WorkspaceDependencyFailure = {
  status: WorkspaceSourceStatus;
  reason: string;
};

export type PortfolioWorkspaceLoader = {
  generatePortfolioSnapshot(subjectKind: WorkspaceSubjectKind, subjectId: string, generatedAt?: string): Promise<CanonicalPortfolioSnapshot>;
};

export type CoachingWorkspaceLoader = {
  getLatestCoachingSnapshot(subjectKind: WorkspaceSubjectKind, subjectId: string, assetScope: '*', timeframeScope: '*'): Promise<CoachingSnapshot | null>;
};

export type AnalyticsWorkspaceLoader = {
  getLatestAnalyticsSnapshot(
    subjectKind: WorkspaceSubjectKind,
    subjectId: string,
    assetScope: '*',
    timeframeScope: '*',
    lookbackDays: number
  ): Promise<AnalyticsSnapshot | null>;
};

export type ReasoningWorkspaceLoader = {
  listRecentReasoningSignals(subjectKind: WorkspaceSubjectKind, subjectId: string, limit: number, asOfIso?: string): Promise<RecentReasoningSignal[]>;
};

export type NotificationWorkspaceLoader = {
  listUnreadInboxCount(subjectKind: WorkspaceSubjectKind, subjectId: string): Promise<number>;
  listDegradedTargetCount(subjectKind: WorkspaceSubjectKind, subjectId: string): Promise<number>;
  listRecentCriticalReceiptCount(subjectKind: WorkspaceSubjectKind, subjectId: string, lookbackHours: number): Promise<number>;
};

export type WorkspaceDependencyLoaders = {
  portfolio: PortfolioWorkspaceLoader;
  coaching: CoachingWorkspaceLoader;
  analytics: AnalyticsWorkspaceLoader;
  reasoning: ReasoningWorkspaceLoader;
  notifications: NotificationWorkspaceLoader;
};
