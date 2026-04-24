import type {
  AnalyticsAssetScope,
  AnalyticsSnapshot,
  AnalyticsTimeframeScope,
  AnalyticsWindow,
  CanonicalJournalCase
} from '@elceo/types';

export type PersistedAnalyticsSnapshotRecord = {
  snapshotId: string;
  subjectKind: AnalyticsWindow['subjectKind'];
  subjectId: string;
  assetScope: AnalyticsAssetScope;
  timeframeScope: AnalyticsTimeframeScope;
  lookbackDays: number;
  generatedAt: string;
  closedCaseCount: number;
  reviewedCaseCount: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  mixedCount: number;
  openCount: number;
  linkedReasoningCount: number;
  linkedDriftCount: number;
  avgRMultiple: number | null;
  avgPnlPercent: number | null;
  medianRMultiple: number | null;
  medianPnlPercent: number | null;
  winRate: number | null;
  lossRate: number | null;
  expectancyR: number | null;
  disciplineScore: number | null;
  adherenceScore: number | null;
  setupPatternsJson: string;
  directionPatternsJson: string;
  behaviorPatternsJson: string;
  reviewInsightsJson: string;
  supportingCaseIdsJson: string;
  summaryJson: string;
  createdAt: string;
};

export type AnalyticsSnapshotRepository = {
  saveSnapshot(record: PersistedAnalyticsSnapshotRecord): Promise<void>;
  getSnapshotById(snapshotId: string): Promise<PersistedAnalyticsSnapshotRecord | null>;
  getLatestSnapshot(
    subjectKind: AnalyticsWindow['subjectKind'],
    subjectId: string,
    assetScope: AnalyticsAssetScope,
    timeframeScope: AnalyticsTimeframeScope,
    lookbackDays: number
  ): Promise<PersistedAnalyticsSnapshotRecord | null>;
  listSnapshots(
    subjectKind: AnalyticsWindow['subjectKind'],
    subjectId: string,
    assetScope?: AnalyticsAssetScope,
    timeframeScope?: AnalyticsTimeframeScope,
    limit?: number
  ): Promise<PersistedAnalyticsSnapshotRecord[]>;
};

export type AnalyticsCaseSource = {
  listSubjectCases(subjectKind: AnalyticsWindow['subjectKind'], subjectId: string, limit?: number): Promise<CanonicalJournalCase[]>;
};

export type AnalyticsSnapshotReplayBundle = {
  record: PersistedAnalyticsSnapshotRecord;
  snapshot: AnalyticsSnapshot;
};
