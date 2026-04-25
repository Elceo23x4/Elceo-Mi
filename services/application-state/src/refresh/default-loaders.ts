import type {
  AnalyticsSnapshot,
  CanonicalPortfolioSnapshot,
  CoachingSnapshot,
  JournalInfluenceSnapshot,
  WorkspaceSnapshot
} from '@elceo/types';
import type { SnapshotRefreshLoaders, SnapshotRefreshSubjectKind } from './loader-contracts';

export type RefreshJournalInfluenceBoundaryLike = {
  generateJournalInfluenceSnapshot(params: {
    subjectKind: SnapshotRefreshSubjectKind;
    subjectId: string;
    assetScope: '*';
    timeframeScope: '*';
    asOfIso?: string;
  }): Promise<JournalInfluenceSnapshot>;
};

export type RefreshAnalyticsBoundaryLike = {
  generateAnalyticsSnapshot(params: {
    subjectKind: SnapshotRefreshSubjectKind;
    subjectId: string;
    assetScope: '*';
    timeframeScope: '*';
    lookbackDays: number;
    generatedAt?: string;
  }): Promise<AnalyticsSnapshot>;
};

export type RefreshCoachingBoundaryLike = {
  generateCoachingSnapshot(params: {
    subjectKind: SnapshotRefreshSubjectKind;
    subjectId: string;
    assetScope: '*';
    timeframeScope: '*';
    generatedAt?: string;
  }): Promise<CoachingSnapshot>;
};

export type RefreshPortfolioBoundaryLike = {
  generatePortfolioSnapshot(subjectKind: SnapshotRefreshSubjectKind, subjectId: string, generatedAt?: string): Promise<CanonicalPortfolioSnapshot>;
};

export type RefreshWorkspaceBoundaryLike = {
  generateWorkspaceSnapshot(subjectKind: SnapshotRefreshSubjectKind, subjectId: string, generatedAt?: string): Promise<WorkspaceSnapshot>;
};

class DefaultJournalInfluenceRefreshLoader {
  constructor(private readonly boundary: RefreshJournalInfluenceBoundaryLike) {}

  generateJournalInfluenceSnapshot(subjectKind: SnapshotRefreshSubjectKind, subjectId: string, assetScope: '*', timeframeScope: '*', asOfIso?: string): Promise<JournalInfluenceSnapshot> {
    return this.boundary.generateJournalInfluenceSnapshot({
      subjectKind,
      subjectId,
      assetScope,
      timeframeScope,
      ...(asOfIso ? { asOfIso } : {})
    });
  }
}

class DefaultAnalyticsRefreshLoader {
  constructor(private readonly boundary: RefreshAnalyticsBoundaryLike, private readonly defaultLookbackDays: number) {}

  generateAnalyticsSnapshot(subjectKind: SnapshotRefreshSubjectKind, subjectId: string, assetScope: '*', timeframeScope: '*', lookbackDays = this.defaultLookbackDays, generatedAt?: string): Promise<AnalyticsSnapshot> {
    return this.boundary.generateAnalyticsSnapshot({
      subjectKind,
      subjectId,
      assetScope,
      timeframeScope,
      lookbackDays,
      ...(generatedAt ? { generatedAt } : {})
    });
  }
}

class DefaultCoachingRefreshLoader {
  constructor(private readonly boundary: RefreshCoachingBoundaryLike) {}

  generateCoachingSnapshot(subjectKind: SnapshotRefreshSubjectKind, subjectId: string, assetScope: '*', timeframeScope: '*', generatedAt?: string): Promise<CoachingSnapshot> {
    return this.boundary.generateCoachingSnapshot({
      subjectKind,
      subjectId,
      assetScope,
      timeframeScope,
      ...(generatedAt ? { generatedAt } : {})
    });
  }
}

class DefaultPortfolioRefreshLoader {
  constructor(private readonly boundary: RefreshPortfolioBoundaryLike) {}

  generatePortfolioSnapshot(subjectKind: SnapshotRefreshSubjectKind, subjectId: string, generatedAt?: string): Promise<CanonicalPortfolioSnapshot> {
    return this.boundary.generatePortfolioSnapshot(subjectKind, subjectId, generatedAt);
  }
}

class DefaultWorkspaceRefreshLoader {
  constructor(private readonly boundary: RefreshWorkspaceBoundaryLike) {}

  generateWorkspaceSnapshot(subjectKind: SnapshotRefreshSubjectKind, subjectId: string, generatedAt?: string): Promise<WorkspaceSnapshot> {
    return this.boundary.generateWorkspaceSnapshot(subjectKind, subjectId, generatedAt);
  }
}

export type RefreshLoaderDependencies = {
  journalInfluenceBoundary: RefreshJournalInfluenceBoundaryLike;
  analyticsBoundary: RefreshAnalyticsBoundaryLike;
  coachingBoundary: RefreshCoachingBoundaryLike;
  portfolioBoundary: RefreshPortfolioBoundaryLike;
  workspaceBoundary: RefreshWorkspaceBoundaryLike;
};

export function createDefaultSnapshotRefreshLoaders(deps: RefreshLoaderDependencies): SnapshotRefreshLoaders {
  return {
    journalInfluence: new DefaultJournalInfluenceRefreshLoader(deps.journalInfluenceBoundary),
    analytics: new DefaultAnalyticsRefreshLoader(deps.analyticsBoundary, 180),
    coaching: new DefaultCoachingRefreshLoader(deps.coachingBoundary),
    portfolio: new DefaultPortfolioRefreshLoader(deps.portfolioBoundary),
    workspace: new DefaultWorkspaceRefreshLoader(deps.workspaceBoundary)
  };
}
