import type {
  AnalyticsAssetScope,
  AnalyticsSnapshot,
  AnalyticsTimeframeScope,
  BehaviorAnalyticsPattern,
  SetupPerformancePattern
} from '@elceo/types';
import type { AnalyticsSnapshotRepository } from '../persistence/contracts';
import { getAnalyticsSnapshotReplayById, getLatestAnalyticsSnapshotReplay, listAnalyticsSnapshotReplays } from './replay';

function setupOrder(left: SetupPerformancePattern, right: SetupPerformancePattern): number {
  return right.performanceScore - left.performanceScore || right.sampleCount - left.sampleCount || left.setupType.localeCompare(right.setupType);
}

function behaviorOrder(left: BehaviorAnalyticsPattern, right: BehaviorAnalyticsPattern): number {
  return right.importanceScore - left.importanceScore || right.sampleCount - left.sampleCount || left.behaviorTag.localeCompare(right.behaviorTag);
}

export class AnalyticsQueryService {
  constructor(private readonly repository: AnalyticsSnapshotRepository) {}

  async getAnalyticsSnapshot(snapshotId: string): Promise<AnalyticsSnapshot | null> {
    const replay = await getAnalyticsSnapshotReplayById(snapshotId, this.repository);
    return replay?.snapshot ?? null;
  }

  async getLatestAnalyticsSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope: AnalyticsAssetScope, timeframeScope: AnalyticsTimeframeScope, lookbackDays: number): Promise<AnalyticsSnapshot | null> {
    const replay = await getLatestAnalyticsSnapshotReplay(subjectKind, subjectId, assetScope, timeframeScope, lookbackDays, this.repository);
    return replay?.snapshot ?? null;
  }

  async listAnalyticsSnapshots(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope?: AnalyticsAssetScope, timeframeScope?: AnalyticsTimeframeScope, limit?: number): Promise<AnalyticsSnapshot[]> {
    const rows = await listAnalyticsSnapshotReplays(subjectKind, subjectId, this.repository, assetScope, timeframeScope, limit);
    return rows.map((item) => item.snapshot);
  }

  async listTopSetupPatterns(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope: AnalyticsAssetScope = '*', timeframeScope: AnalyticsTimeframeScope = '*', lookbackDays = 180, limit = 5): Promise<SetupPerformancePattern[]> {
    const latest = await this.getLatestAnalyticsSnapshot(subjectKind, subjectId, assetScope, timeframeScope, lookbackDays);
    if (!latest) return [];
    return [...latest.summary.setupPatterns].sort(setupOrder).slice(0, Math.max(1, Math.min(50, limit)));
  }

  async listTopBehaviorPatterns(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope: AnalyticsAssetScope = '*', timeframeScope: AnalyticsTimeframeScope = '*', lookbackDays = 180, limit = 5): Promise<BehaviorAnalyticsPattern[]> {
    const latest = await this.getLatestAnalyticsSnapshot(subjectKind, subjectId, assetScope, timeframeScope, lookbackDays);
    if (!latest) return [];
    return [...latest.summary.behaviorPatterns].sort(behaviorOrder).slice(0, Math.max(1, Math.min(50, limit)));
  }
}
