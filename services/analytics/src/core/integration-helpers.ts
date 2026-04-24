import type { AnalyticsAssetScope, AnalyticsTimeframeScope, AnalyticsSnapshotSummary, BehaviorAnalyticsPattern, SetupPerformancePattern } from '@elceo/types';
import { AnalyticsQueryService } from './query-service';

export async function getLatestAnalyticsSummaryForSubject(
  queryService: AnalyticsQueryService,
  subjectKind: 'user' | 'workspace' | 'ops',
  subjectId: string,
  assetScope: AnalyticsAssetScope = '*',
  timeframeScope: AnalyticsTimeframeScope = '*',
  lookbackDays = 180
): Promise<AnalyticsSnapshotSummary | null> {
  const snapshot = await queryService.getLatestAnalyticsSnapshot(subjectKind, subjectId, assetScope, timeframeScope, lookbackDays);
  return snapshot?.summary ?? null;
}

export async function listUnderperformingSetups(
  queryService: AnalyticsQueryService,
  subjectKind: 'user' | 'workspace' | 'ops',
  subjectId: string,
  minSampleCount = 3,
  threshold = 45
): Promise<SetupPerformancePattern[]> {
  const top = await queryService.listTopSetupPatterns(subjectKind, subjectId, '*', '*', 180, 50);
  return top.filter((item) => item.sampleCount >= minSampleCount && item.performanceScore < threshold);
}

export async function listHighRiskBehaviorPatterns(
  queryService: AnalyticsQueryService,
  subjectKind: 'user' | 'workspace' | 'ops',
  subjectId: string,
  threshold = 35
): Promise<BehaviorAnalyticsPattern[]> {
  const patterns = await queryService.listTopBehaviorPatterns(subjectKind, subjectId, '*', '*', 180, 50);
  return patterns.filter((item) => item.lossAssociationScore >= threshold || item.impulsiveAssociationScore >= threshold);
}
