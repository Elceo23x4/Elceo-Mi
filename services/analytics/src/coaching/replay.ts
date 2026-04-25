import type { AnalyticsAssetScope, AnalyticsTimeframeScope, CoachingSnapshot } from '@elceo/types';
import type { CoachingSnapshotReplayBundle, CoachingSnapshotRepository, PersistedCoachingSnapshotRecord } from './persistence/contracts';
import { deserializeCoachingSnapshot } from './serialization';

function toSnapshot(record: PersistedCoachingSnapshotRecord): CoachingSnapshot {
  let summary: unknown;
  try {
    summary = JSON.parse(record.summaryJson) as unknown;
  } catch {
    throw new Error('malformed_json');
  }
  return deserializeCoachingSnapshot(
    JSON.stringify({
      snapshotId: record.snapshotId,
      summary,
      createdAt: record.createdAt
    })
  );
}

function toBundle(record: PersistedCoachingSnapshotRecord): CoachingSnapshotReplayBundle {
  return { record, snapshot: toSnapshot(record) };
}

export async function getCoachingSnapshotReplayById(snapshotId: string, repository: CoachingSnapshotRepository): Promise<CoachingSnapshotReplayBundle | null> {
  const row = await repository.getSnapshotById(snapshotId);
  return row ? toBundle(row) : null;
}

export async function getLatestCoachingSnapshotReplay(
  subjectKind: 'user' | 'workspace' | 'ops',
  subjectId: string,
  assetScope: AnalyticsAssetScope,
  timeframeScope: AnalyticsTimeframeScope,
  repository: CoachingSnapshotRepository
): Promise<CoachingSnapshotReplayBundle | null> {
  const row = await repository.getLatestSnapshot(subjectKind, subjectId, assetScope, timeframeScope);
  return row ? toBundle(row) : null;
}

export async function listCoachingSnapshotReplays(
  subjectKind: 'user' | 'workspace' | 'ops',
  subjectId: string,
  repository: CoachingSnapshotRepository,
  assetScope?: AnalyticsAssetScope,
  timeframeScope?: AnalyticsTimeframeScope,
  limit?: number
): Promise<CoachingSnapshotReplayBundle[]> {
  const rows = await repository.listSnapshots(subjectKind, subjectId, assetScope, timeframeScope, limit);
  return rows.map((row) => toBundle(row));
}
