import type { AnalyticsAssetScope, AnalyticsSnapshot, AnalyticsTimeframeScope } from '@elceo/types';
import type { AnalyticsSnapshotReplayBundle, AnalyticsSnapshotRepository, PersistedAnalyticsSnapshotRecord } from '../persistence/contracts';
import { deserializeAnalyticsSnapshot, deserializeAnalyticsSnapshotSummary } from './serialization';

function toSnapshot(record: PersistedAnalyticsSnapshotRecord): AnalyticsSnapshot {
  const summary = deserializeAnalyticsSnapshotSummary(record.summaryJson);
  return deserializeAnalyticsSnapshot(JSON.stringify({ snapshotId: record.snapshotId, summary, createdAt: record.createdAt }));
}

function toBundle(record: PersistedAnalyticsSnapshotRecord): AnalyticsSnapshotReplayBundle {
  return { record, snapshot: toSnapshot(record) };
}

export async function getAnalyticsSnapshotReplayById(snapshotId: string, repository: AnalyticsSnapshotRepository): Promise<AnalyticsSnapshotReplayBundle | null> {
  const record = await repository.getSnapshotById(snapshotId);
  return record ? toBundle(record) : null;
}

export async function getLatestAnalyticsSnapshotReplay(
  subjectKind: 'user' | 'workspace' | 'ops',
  subjectId: string,
  assetScope: AnalyticsAssetScope,
  timeframeScope: AnalyticsTimeframeScope,
  lookbackDays: number,
  repository: AnalyticsSnapshotRepository
): Promise<AnalyticsSnapshotReplayBundle | null> {
  const record = await repository.getLatestSnapshot(subjectKind, subjectId, assetScope, timeframeScope, lookbackDays);
  return record ? toBundle(record) : null;
}

export async function listAnalyticsSnapshotReplays(
  subjectKind: 'user' | 'workspace' | 'ops',
  subjectId: string,
  repository: AnalyticsSnapshotRepository,
  assetScope?: AnalyticsAssetScope,
  timeframeScope?: AnalyticsTimeframeScope,
  limit?: number
): Promise<AnalyticsSnapshotReplayBundle[]> {
  const rows = await repository.listSnapshots(subjectKind, subjectId, assetScope, timeframeScope, limit);
  return rows.map((record) => toBundle(record));
}
