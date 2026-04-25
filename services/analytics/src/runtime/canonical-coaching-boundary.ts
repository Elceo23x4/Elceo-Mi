import type { AnalyticsAssetScope, AnalyticsTimeframeScope, CoachingActionItem, CoachingFocusArea, CoachingSnapshot, CoachingStrengthItem, CoachingTheme } from '@elceo/types';
import { CoachingQueryService } from '../coaching/query-service';
import { CoachingSnapshotService, type GenerateCoachingSnapshotParams } from '../coaching/snapshot-service';
import { CoachingInputLoader } from '../coaching/input-loader';
import {
  getAnalyticsSnapshotLookupRepository,
  getCoachingSnapshotRepository,
  getJournalInfluenceSnapshotLookupRepository
} from '../coaching/persistence';

export class CanonicalCoachingBoundaryService {
  private readonly queryService = new CoachingQueryService(getCoachingSnapshotRepository());
  private readonly snapshotService = new CoachingSnapshotService(
    new CoachingInputLoader(getAnalyticsSnapshotLookupRepository(), getJournalInfluenceSnapshotLookupRepository()),
    getCoachingSnapshotRepository()
  );

  generateCoachingSnapshot(params: GenerateCoachingSnapshotParams): Promise<CoachingSnapshot> {
    return this.snapshotService.generateCoachingSnapshot(params);
  }

  getCoachingSnapshot(snapshotId: string): Promise<CoachingSnapshot | null> {
    return this.queryService.getCoachingSnapshot(snapshotId);
  }

  getLatestCoachingSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope: AnalyticsAssetScope, timeframeScope: AnalyticsTimeframeScope): Promise<CoachingSnapshot | null> {
    return this.queryService.getLatestCoachingSnapshot(subjectKind, subjectId, assetScope, timeframeScope);
  }

  listCoachingSnapshots(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope?: AnalyticsAssetScope, timeframeScope?: AnalyticsTimeframeScope, limit?: number): Promise<CoachingSnapshot[]> {
    return this.queryService.listCoachingSnapshots(subjectKind, subjectId, assetScope, timeframeScope, limit);
  }

  listTopCoachingFocusAreas(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope?: AnalyticsAssetScope, timeframeScope?: AnalyticsTimeframeScope, limit?: number): Promise<CoachingFocusArea[]> {
    return this.queryService.listTopCoachingFocusAreas(subjectKind, subjectId, assetScope, timeframeScope, limit);
  }

  listTopCoachingStrengths(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope?: AnalyticsAssetScope, timeframeScope?: AnalyticsTimeframeScope, limit?: number): Promise<CoachingStrengthItem[]> {
    return this.queryService.listTopCoachingStrengths(subjectKind, subjectId, assetScope, timeframeScope, limit);
  }

  listCurrentActionPlan(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope?: AnalyticsAssetScope, timeframeScope?: AnalyticsTimeframeScope): Promise<CoachingActionItem[]> {
    return this.queryService.listCurrentActionPlan(subjectKind, subjectId, assetScope, timeframeScope);
  }

  async getCriticalCoachingThemes(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope: AnalyticsAssetScope = '*', timeframeScope: AnalyticsTimeframeScope = '*'): Promise<CoachingTheme[]> {
    const focusAreas = await this.queryService.listTopCoachingFocusAreas(subjectKind, subjectId, assetScope, timeframeScope, 20);
    return focusAreas.filter((item) => item.priority === 'critical').map((item) => item.theme);
  }

  async getTopCoachingAlertCandidates(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope: AnalyticsAssetScope = '*', timeframeScope: AnalyticsTimeframeScope = '*', limit = 3): Promise<CoachingFocusArea[]> {
    const focus = await this.queryService.listTopCoachingFocusAreas(subjectKind, subjectId, assetScope, timeframeScope, Math.max(1, limit));
    return focus;
  }
}
