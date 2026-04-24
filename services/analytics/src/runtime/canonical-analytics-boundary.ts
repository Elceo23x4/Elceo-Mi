import type { AnalyticsAssetScope, AnalyticsSnapshot, AnalyticsTimeframeScope, BehaviorAnalyticsPattern, SetupPerformancePattern } from '@elceo/types';
import { AnalyticsQueryService } from '../core/query-service';
import { AnalyticsSnapshotService, type GenerateAnalyticsSnapshotParams } from '../core/snapshot-service';
import { getAnalyticsCaseSource, getAnalyticsSnapshotRepository } from '../persistence/index';

export class CanonicalAnalyticsBoundaryService {
  private readonly snapshotService = new AnalyticsSnapshotService(getAnalyticsCaseSource(), getAnalyticsSnapshotRepository());
  private readonly queryService = new AnalyticsQueryService(getAnalyticsSnapshotRepository());

  generateAnalyticsSnapshot(params: GenerateAnalyticsSnapshotParams): Promise<AnalyticsSnapshot> {
    return this.snapshotService.generateAnalyticsSnapshot(params);
  }

  getAnalyticsSnapshot(snapshotId: string): Promise<AnalyticsSnapshot | null> {
    return this.queryService.getAnalyticsSnapshot(snapshotId);
  }

  getLatestAnalyticsSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope: AnalyticsAssetScope, timeframeScope: AnalyticsTimeframeScope, lookbackDays: number): Promise<AnalyticsSnapshot | null> {
    return this.queryService.getLatestAnalyticsSnapshot(subjectKind, subjectId, assetScope, timeframeScope, lookbackDays);
  }

  listAnalyticsSnapshots(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope?: AnalyticsAssetScope, timeframeScope?: AnalyticsTimeframeScope, limit?: number): Promise<AnalyticsSnapshot[]> {
    return this.queryService.listAnalyticsSnapshots(subjectKind, subjectId, assetScope, timeframeScope, limit);
  }

  listTopSetupPatterns(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope?: AnalyticsAssetScope, timeframeScope?: AnalyticsTimeframeScope, lookbackDays?: number, limit?: number): Promise<SetupPerformancePattern[]> {
    return this.queryService.listTopSetupPatterns(subjectKind, subjectId, assetScope, timeframeScope, lookbackDays, limit);
  }

  listTopBehaviorPatterns(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope?: AnalyticsAssetScope, timeframeScope?: AnalyticsTimeframeScope, lookbackDays?: number, limit?: number): Promise<BehaviorAnalyticsPattern[]> {
    return this.queryService.listTopBehaviorPatterns(subjectKind, subjectId, assetScope, timeframeScope, lookbackDays, limit);
  }
}
