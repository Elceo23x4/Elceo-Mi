import type { AnalyticsAssetScope, AnalyticsTimeframeScope, CoachingActionItem, CoachingFocusArea, CoachingSnapshot, CoachingStrengthItem } from '@elceo/types';
import type { CoachingSnapshotRepository } from './persistence/contracts';
import { getCoachingSnapshotReplayById, getLatestCoachingSnapshotReplay, listCoachingSnapshotReplays } from './replay';

const PRIORITY_RANK: Record<CoachingFocusArea['priority'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3
};

function focusSort(left: CoachingFocusArea, right: CoachingFocusArea): number {
  return right.score - left.score || PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority] || left.theme.localeCompare(right.theme);
}

function strengthSort(left: CoachingStrengthItem, right: CoachingStrengthItem): number {
  return right.score - left.score || left.theme.localeCompare(right.theme);
}

function actionSort(left: CoachingActionItem, right: CoachingActionItem): number {
  return right.score - left.score || PRIORITY_RANK[left.priority] - PRIORITY_RANK[right.priority] || left.theme.localeCompare(right.theme);
}

function cap(limit?: number): number {
  return Math.max(1, Math.min(50, limit ?? 5));
}

export class CoachingQueryService {
  constructor(private readonly repository: CoachingSnapshotRepository) {}

  async getCoachingSnapshot(snapshotId: string): Promise<CoachingSnapshot | null> {
    const replay = await getCoachingSnapshotReplayById(snapshotId, this.repository);
    return replay?.snapshot ?? null;
  }

  async getLatestCoachingSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope: AnalyticsAssetScope, timeframeScope: AnalyticsTimeframeScope): Promise<CoachingSnapshot | null> {
    const replay = await getLatestCoachingSnapshotReplay(subjectKind, subjectId, assetScope, timeframeScope, this.repository);
    return replay?.snapshot ?? null;
  }

  async listCoachingSnapshots(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope?: AnalyticsAssetScope, timeframeScope?: AnalyticsTimeframeScope, limit?: number): Promise<CoachingSnapshot[]> {
    const replays = await listCoachingSnapshotReplays(subjectKind, subjectId, this.repository, assetScope, timeframeScope, limit);
    return replays.map((item) => item.snapshot);
  }

  async listTopCoachingFocusAreas(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope: AnalyticsAssetScope = '*', timeframeScope: AnalyticsTimeframeScope = '*', limit = 5): Promise<CoachingFocusArea[]> {
    const latest = await this.getLatestCoachingSnapshot(subjectKind, subjectId, assetScope, timeframeScope);
    if (!latest) return [];
    return [...latest.summary.focusAreas].sort(focusSort).slice(0, cap(limit));
  }

  async listTopCoachingStrengths(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope: AnalyticsAssetScope = '*', timeframeScope: AnalyticsTimeframeScope = '*', limit = 5): Promise<CoachingStrengthItem[]> {
    const latest = await this.getLatestCoachingSnapshot(subjectKind, subjectId, assetScope, timeframeScope);
    if (!latest) return [];
    return [...latest.summary.strengths].sort(strengthSort).slice(0, cap(limit));
  }

  async listCurrentActionPlan(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, assetScope: AnalyticsAssetScope = '*', timeframeScope: AnalyticsTimeframeScope = '*'): Promise<CoachingActionItem[]> {
    const latest = await this.getLatestCoachingSnapshot(subjectKind, subjectId, assetScope, timeframeScope);
    if (!latest) return [];
    return [...latest.summary.actionPlan].sort(actionSort);
  }
}
