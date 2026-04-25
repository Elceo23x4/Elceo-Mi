import type {
  RefreshAttentionSummary,
  SnapshotFreshnessRecord,
  SnapshotRefreshRunReport,
  SnapshotRefreshTriggerKind
} from '@elceo/types';
import {
  getSnapshotFreshnessRepository,
  getSnapshotRefreshRunRepository,
  type SnapshotFreshnessRepository,
  type SnapshotRefreshRunRepository
} from '../persistence/index';
import { SnapshotFreshnessService } from '../refresh/freshness-service';
import type { SnapshotRefreshLoaders } from '../refresh/loader-contracts';
import { SnapshotRefreshQueryService } from '../refresh/query-service';
import { SnapshotRefreshService } from '../refresh/refresh-service';

export class CanonicalRefreshBoundaryService {
  private readonly refreshService: SnapshotRefreshService;
  private readonly freshnessService: SnapshotFreshnessService;
  private readonly queryService: SnapshotRefreshQueryService;

  constructor(
    loaders: SnapshotRefreshLoaders,
    refreshRunRepository: SnapshotRefreshRunRepository = getSnapshotRefreshRunRepository(),
    freshnessRepository: SnapshotFreshnessRepository = getSnapshotFreshnessRepository()
  ) {
    this.refreshService = new SnapshotRefreshService(loaders, refreshRunRepository, freshnessRepository);
    this.freshnessService = new SnapshotFreshnessService(freshnessRepository);
    this.queryService = new SnapshotRefreshQueryService(refreshRunRepository, freshnessRepository);
  }

  runSnapshotRefresh(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    triggerKind: SnapshotRefreshTriggerKind,
    generatedAt?: string
  ): Promise<SnapshotRefreshRunReport> {
    return this.refreshService.runSnapshotRefresh(subjectKind, subjectId, triggerKind, generatedAt);
  }

  runManualFullRefresh(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, generatedAt?: string): Promise<SnapshotRefreshRunReport> {
    return this.runSnapshotRefresh(subjectKind, subjectId, 'manual', generatedAt);
  }

  recomputeFreshnessForSubject(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    evaluatedAt?: string
  ): Promise<SnapshotFreshnessRecord[]> {
    return this.freshnessService.recomputeFreshnessForSubject(subjectKind, subjectId, evaluatedAt);
  }

  getSnapshotRefreshRun(refreshRunId: string): Promise<SnapshotRefreshRunReport | null> {
    return this.queryService.getSnapshotRefreshRun(refreshRunId);
  }

  getLatestSnapshotRefreshRun(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<SnapshotRefreshRunReport | null> {
    return this.queryService.getLatestSnapshotRefreshRun(subjectKind, subjectId);
  }

  listSnapshotRefreshRuns(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number): Promise<SnapshotRefreshRunReport[]> {
    return this.queryService.listSnapshotRefreshRuns(subjectKind, subjectId, limit);
  }

  listSnapshotFreshnessForSubject(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<SnapshotFreshnessRecord[]> {
    return this.queryService.listSnapshotFreshnessForSubject(subjectKind, subjectId);
  }

  getRefreshAttentionSummary(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<RefreshAttentionSummary> {
    return this.queryService.getRefreshAttentionSummary(subjectKind, subjectId);
  }

  listDomainsNeedingRefresh(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<SnapshotFreshnessRecord[]> {
    return this.queryService.listDomainsNeedingRefresh(subjectKind, subjectId);
  }

  async getRefreshRunStatusSummary(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<{
    latestRunStatus: SnapshotRefreshRunReport['overallStatus'] | null;
    latestRunGeneratedAt: string | null;
    attentionState: RefreshAttentionSummary['overallFreshnessState'];
  }> {
    const [latestRun, attention] = await Promise.all([
      this.getLatestSnapshotRefreshRun(subjectKind, subjectId),
      this.getRefreshAttentionSummary(subjectKind, subjectId)
    ]);
    return {
      latestRunStatus: latestRun?.overallStatus ?? null,
      latestRunGeneratedAt: latestRun?.generatedAt ?? null,
      attentionState: attention.overallFreshnessState
    };
  }

  async shouldWorkspaceBeRefreshed(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<boolean> {
    const needing = await this.listDomainsNeedingRefresh(subjectKind, subjectId);
    return needing.some((row) => row.domain === 'workspace');
  }
}
