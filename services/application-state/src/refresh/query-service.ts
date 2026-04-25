import type { RefreshAttentionSummary, SnapshotDomainKind, SnapshotFreshnessRecord, SnapshotRefreshRunReport } from '@elceo/types';
import type { SnapshotFreshnessRepository, SnapshotRefreshRunRepository } from '../persistence/contracts';
import { FRESHNESS_STATE_PRIORITY, SNAPSHOT_FRESHNESS_SEVERITY_DOMAIN_ORDER } from './constants';
import { SnapshotFreshnessService } from './freshness-service';
import {
  listSnapshotFreshnessReplay,
  listSnapshotRefreshRunReplays,
  getLatestSnapshotRefreshRunReplay,
  getSnapshotRefreshRunReplayById
} from './replay';

function domainSeverityIndex(domain: SnapshotDomainKind): number {
  return SNAPSHOT_FRESHNESS_SEVERITY_DOMAIN_ORDER.indexOf(domain);
}

export class SnapshotRefreshQueryService {
  private readonly freshnessService: SnapshotFreshnessService;

  constructor(
    private readonly refreshRunRepository: SnapshotRefreshRunRepository,
    private readonly freshnessRepository: SnapshotFreshnessRepository
  ) {
    this.freshnessService = new SnapshotFreshnessService(freshnessRepository);
  }

  async getSnapshotRefreshRun(refreshRunId: string): Promise<SnapshotRefreshRunReport | null> {
    const replay = await getSnapshotRefreshRunReplayById(refreshRunId, this.refreshRunRepository, this.freshnessRepository);
    return replay?.report ?? null;
  }

  async getLatestSnapshotRefreshRun(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<SnapshotRefreshRunReport | null> {
    const replay = await getLatestSnapshotRefreshRunReplay(subjectKind, subjectId, this.refreshRunRepository, this.freshnessRepository);
    return replay?.report ?? null;
  }

  async listSnapshotRefreshRuns(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number): Promise<SnapshotRefreshRunReport[]> {
    const replays = await listSnapshotRefreshRunReplays(subjectKind, subjectId, this.refreshRunRepository, this.freshnessRepository, limit);
    return replays.map((entry) => entry.report);
  }

  listSnapshotFreshnessForSubject(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<SnapshotFreshnessRecord[]> {
    return listSnapshotFreshnessReplay(subjectKind, subjectId, this.freshnessRepository);
  }

  getRefreshAttentionSummary(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<RefreshAttentionSummary> {
    return this.freshnessService.getLatestRefreshAttentionSummary(subjectKind, subjectId);
  }

  async listDomainsNeedingRefresh(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<SnapshotFreshnessRecord[]> {
    const rows = await listSnapshotFreshnessReplay(subjectKind, subjectId, this.freshnessRepository);
    return rows
      .filter((row) => row.freshnessState === 'failed' || row.freshnessState === 'stale' || row.freshnessState === 'missing')
      .sort((left, right) => {
        const stateDiff = FRESHNESS_STATE_PRIORITY[left.freshnessState] - FRESHNESS_STATE_PRIORITY[right.freshnessState];
        if (stateDiff !== 0) return stateDiff;
        const domainDiff = domainSeverityIndex(left.domain) - domainSeverityIndex(right.domain);
        if (domainDiff !== 0) return domainDiff;
        return left.freshnessId.localeCompare(right.freshnessId);
      });
  }
}
