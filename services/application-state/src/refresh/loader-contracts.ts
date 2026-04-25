import type {
  AnalyticsSnapshot,
  CanonicalPortfolioSnapshot,
  CoachingSnapshot,
  JournalInfluenceSnapshot,
  WorkspaceSnapshot
} from '@elceo/types';

export type SnapshotRefreshSubjectKind = 'user' | 'workspace' | 'ops';

export interface JournalInfluenceRefreshLoader {
  generateJournalInfluenceSnapshot(
    subjectKind: SnapshotRefreshSubjectKind,
    subjectId: string,
    assetScope: '*',
    timeframeScope: '*',
    asOfIso?: string
  ): Promise<JournalInfluenceSnapshot>;
}

export interface AnalyticsRefreshLoader {
  generateAnalyticsSnapshot(
    subjectKind: SnapshotRefreshSubjectKind,
    subjectId: string,
    assetScope: '*',
    timeframeScope: '*',
    lookbackDays: number,
    generatedAt?: string
  ): Promise<AnalyticsSnapshot>;
}

export interface CoachingRefreshLoader {
  generateCoachingSnapshot(
    subjectKind: SnapshotRefreshSubjectKind,
    subjectId: string,
    assetScope: '*',
    timeframeScope: '*',
    generatedAt?: string
  ): Promise<CoachingSnapshot>;
}

export interface PortfolioRefreshLoader {
  generatePortfolioSnapshot(subjectKind: SnapshotRefreshSubjectKind, subjectId: string, generatedAt?: string): Promise<CanonicalPortfolioSnapshot>;
}

export interface WorkspaceRefreshLoader {
  generateWorkspaceSnapshot(subjectKind: SnapshotRefreshSubjectKind, subjectId: string, generatedAt?: string): Promise<WorkspaceSnapshot>;
}

export type SnapshotRefreshLoaders = {
  journalInfluence: JournalInfluenceRefreshLoader;
  analytics: AnalyticsRefreshLoader;
  coaching: CoachingRefreshLoader;
  portfolio: PortfolioRefreshLoader;
  workspace: WorkspaceRefreshLoader;
};
