import type { CanonicalAssetSymbol, JournalInfluenceSnapshot, Timeframe } from '@elceo/types';
import type { JournalInfluenceRepository, PersistedJournalInfluenceSnapshotRecord } from '../persistence/contracts';
import { deserializeJournalInfluenceSnapshot, deserializeJournalInfluenceSummary } from './influence-serialization';

export type JournalInfluenceReplayBundle = {
  record: PersistedJournalInfluenceSnapshotRecord;
  snapshot: JournalInfluenceSnapshot;
};

function toSnapshot(record: PersistedJournalInfluenceSnapshotRecord): JournalInfluenceSnapshot {
  const summary = deserializeJournalInfluenceSummary(record.summaryJson);
  return deserializeJournalInfluenceSnapshot(JSON.stringify({ snapshotId: record.snapshotId, summary, createdAt: record.createdAt }));
}

function toReplayBundle(record: PersistedJournalInfluenceSnapshotRecord): JournalInfluenceReplayBundle {
  return { record, snapshot: toSnapshot(record) };
}

export async function getJournalInfluenceReplayById(snapshotId: string, repository: JournalInfluenceRepository): Promise<JournalInfluenceReplayBundle | null> {
  const record = await repository.getInfluenceSnapshotById(snapshotId);
  return record ? toReplayBundle(record) : null;
}

export async function getLatestJournalInfluenceReplay(
  subjectKind: 'user' | 'workspace' | 'ops',
  subjectId: string,
  assetScope: CanonicalAssetSymbol | '*',
  timeframeScope: Timeframe | '*',
  repository: JournalInfluenceRepository
): Promise<JournalInfluenceReplayBundle | null> {
  const record = await repository.getLatestInfluenceSnapshot(subjectKind, subjectId, assetScope, timeframeScope);
  return record ? toReplayBundle(record) : null;
}

export async function listJournalInfluenceReplays(
  subjectKind: 'user' | 'workspace' | 'ops',
  subjectId: string,
  repository: JournalInfluenceRepository,
  assetScope?: CanonicalAssetSymbol | '*',
  timeframeScope?: Timeframe | '*',
  limit?: number
): Promise<JournalInfluenceReplayBundle[]> {
  const rows = await repository.listInfluenceSnapshots(subjectKind, subjectId, assetScope, timeframeScope, limit);
  return rows.map((item) => toReplayBundle(item));
}
