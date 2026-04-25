import type {
  AnalyticsAssetScope,
  AnalyticsSnapshotSummary,
  AnalyticsTimeframeScope,
  CoachingSnapshot,
  JournalInfluenceSummary
} from '@elceo/types';

export type PersistedCoachingSnapshotRecord = {
  snapshotId: string;
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  assetScope: AnalyticsAssetScope;
  timeframeScope: AnalyticsTimeframeScope;
  generatedAt: string;
  analyticsSnapshotId: string | null;
  journalInfluenceSnapshotId: string | null;
  totalSignalsConsidered: number;
  focusAreasJson: string;
  strengthsJson: string;
  actionPlanJson: string;
  summaryNotesJson: string;
  supportingCaseIdsJson: string;
  summaryJson: string;
  createdAt: string;
};

export type CoachingSnapshotRepository = {
  saveSnapshot(record: PersistedCoachingSnapshotRecord): Promise<void>;
  getSnapshotById(snapshotId: string): Promise<PersistedCoachingSnapshotRecord | null>;
  getLatestSnapshot(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope: AnalyticsAssetScope,
    timeframeScope: AnalyticsTimeframeScope
  ): Promise<PersistedCoachingSnapshotRecord | null>;
  listSnapshots(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope?: AnalyticsAssetScope,
    timeframeScope?: AnalyticsTimeframeScope,
    limit?: number
  ): Promise<PersistedCoachingSnapshotRecord[]>;
};

export type CoachingSnapshotReplayBundle = {
  record: PersistedCoachingSnapshotRecord;
  snapshot: CoachingSnapshot;
};

export type AnalyticsSnapshotLookupRepository = {
  getLatestSnapshot(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope: AnalyticsAssetScope,
    timeframeScope: AnalyticsTimeframeScope,
    lookbackDays: number
  ): Promise<{ snapshotId: string; summaryJson: string } | null>;
};

export type JournalInfluenceSnapshotLookupRepository = {
  getLatestInfluenceSnapshot(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope: AnalyticsAssetScope,
    timeframeScope: AnalyticsTimeframeScope
  ): Promise<{ snapshotId: string; summaryJson: string } | null>;
};

export type LoadedCoachingInputs = {
  analytics: { snapshotId: string; summary: AnalyticsSnapshotSummary } | null;
  journalInfluence: { snapshotId: string; summary: JournalInfluenceSummary } | null;
};
