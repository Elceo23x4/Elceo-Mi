import type { WorkspaceAgendaItem, WorkspaceDependencyStatus, WorkspaceSnapshot, WorkspaceSubjectKind } from '@elceo/types';
import { getWorkspaceSnapshotRepository } from '../persistence/workspace-repository';
import type { WorkspaceSnapshotRepository } from '../persistence/contracts';
import {
  DefaultAnalyticsWorkspaceLoader,
  DefaultCoachingWorkspaceLoader,
  DefaultNotificationWorkspaceLoader,
  DefaultPortfolioWorkspaceLoader,
  DefaultReasoningWorkspaceLoader,
  type AnalyticsBoundaryLike,
  type CoachingBoundaryLike,
  type NotificationRepositoriesLike,
  type PortfolioBoundaryLike,
  type ReasoningRunsRepositoryLike,
  type ReasoningSnapshotRepositoryLike
} from '../workspace/default-loaders';
import type { WorkspaceDependencyLoaders } from '../workspace/dependency-contracts';
import { WorkspaceSnapshotService } from '../workspace/snapshot-service';
import { WorkspaceQueryService, type WorkspaceAttentionSummary } from '../workspace/query-service';

export type WorkspaceDefaultLoaderDependencies = {
  portfolioBoundary: PortfolioBoundaryLike;
  coachingBoundary: CoachingBoundaryLike;
  analyticsBoundary: AnalyticsBoundaryLike;
  reasoningRunsRepository: ReasoningRunsRepositoryLike;
  reasoningSnapshotRepository: ReasoningSnapshotRepositoryLike;
  notificationRepositories: NotificationRepositoriesLike;
};

export function createWorkspaceDefaultLoaders(deps: WorkspaceDefaultLoaderDependencies): WorkspaceDependencyLoaders {
  return {
    portfolio: new DefaultPortfolioWorkspaceLoader(deps.portfolioBoundary),
    coaching: new DefaultCoachingWorkspaceLoader(deps.coachingBoundary),
    analytics: new DefaultAnalyticsWorkspaceLoader(deps.analyticsBoundary, 180),
    reasoning: new DefaultReasoningWorkspaceLoader(deps.reasoningRunsRepository, deps.reasoningSnapshotRepository),
    notifications: new DefaultNotificationWorkspaceLoader(deps.notificationRepositories)
  };
}

export class CanonicalWorkspaceBoundaryService {
  private readonly snapshotService: WorkspaceSnapshotService;
  private readonly queryService: WorkspaceQueryService;

  constructor(
    private readonly repository: WorkspaceSnapshotRepository = getWorkspaceSnapshotRepository(),
    loaders?: WorkspaceDependencyLoaders
  ) {
    if (!loaders) throw new Error('workspace_loaders_required');
    this.snapshotService = new WorkspaceSnapshotService(repository, loaders);
    this.queryService = new WorkspaceQueryService(repository);
  }

  generateWorkspaceSnapshot(subjectKind: WorkspaceSubjectKind, subjectId: string, generatedAt?: string): Promise<WorkspaceSnapshot> {
    return this.snapshotService.generateWorkspaceSnapshot(subjectKind, subjectId, generatedAt);
  }

  getWorkspaceSnapshot(snapshotId: string): Promise<WorkspaceSnapshot | null> {
    return this.queryService.getWorkspaceSnapshot(snapshotId);
  }

  getLatestWorkspaceSnapshot(subjectKind: WorkspaceSubjectKind, subjectId: string): Promise<WorkspaceSnapshot | null> {
    return this.queryService.getLatestWorkspaceSnapshot(subjectKind, subjectId);
  }

  listWorkspaceSnapshots(subjectKind: WorkspaceSubjectKind, subjectId: string, limit?: number): Promise<WorkspaceSnapshot[]> {
    return this.queryService.listWorkspaceSnapshots(subjectKind, subjectId, limit);
  }

  getCurrentWorkspaceAgenda(subjectKind: WorkspaceSubjectKind, subjectId: string): Promise<WorkspaceAgendaItem[]> {
    return this.queryService.getCurrentWorkspaceAgenda(subjectKind, subjectId);
  }

  getCurrentWorkspaceAttentionSummary(subjectKind: WorkspaceSubjectKind, subjectId: string): Promise<WorkspaceAttentionSummary | null> {
    return this.queryService.getCurrentWorkspaceAttentionSummary(subjectKind, subjectId);
  }

  async listCriticalWorkspaceAgenda(subjectKind: WorkspaceSubjectKind, subjectId: string, limit = 5): Promise<WorkspaceAgendaItem[]> {
    const agenda = await this.queryService.getCurrentWorkspaceAgenda(subjectKind, subjectId);
    return agenda.filter((item) => item.priority === 'critical').slice(0, Math.max(1, limit));
  }

  async getWorkspaceDependencyStatus(subjectKind: WorkspaceSubjectKind, subjectId: string): Promise<WorkspaceDependencyStatus | null> {
    const latest = await this.queryService.getLatestWorkspaceSnapshot(subjectKind, subjectId);
    return latest?.summary.dependencyStatus ?? null;
  }
}
