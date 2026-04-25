import type { WorkspaceSnapshot } from '@elceo/types';
import type { PersistedWorkspaceSnapshotRecord, WorkspaceSnapshotRepository } from '../persistence/contracts';
import { deserializeWorkspaceSnapshot } from './serialization';

export type WorkspaceSnapshotReplayBundle = {
  record: PersistedWorkspaceSnapshotRecord;
  snapshot: WorkspaceSnapshot;
};

function toSnapshot(record: PersistedWorkspaceSnapshotRecord): WorkspaceSnapshot {
  let summary: unknown;
  try {
    summary = JSON.parse(record.summaryJson) as unknown;
  } catch {
    throw new Error('malformed_json');
  }
  return deserializeWorkspaceSnapshot(JSON.stringify({ snapshotId: record.snapshotId, summary, createdAt: record.createdAt }));
}

function toBundle(record: PersistedWorkspaceSnapshotRecord): WorkspaceSnapshotReplayBundle {
  return { record, snapshot: toSnapshot(record) };
}

export async function getWorkspaceSnapshotReplayById(snapshotId: string, repository: WorkspaceSnapshotRepository): Promise<WorkspaceSnapshotReplayBundle | null> {
  const row = await repository.getSnapshotById(snapshotId);
  return row ? toBundle(row) : null;
}

export async function getLatestWorkspaceSnapshotReplay(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, repository: WorkspaceSnapshotRepository): Promise<WorkspaceSnapshotReplayBundle | null> {
  const row = await repository.getLatestSnapshot(subjectKind, subjectId);
  return row ? toBundle(row) : null;
}

export async function listWorkspaceSnapshotReplays(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, repository: WorkspaceSnapshotRepository, limit?: number): Promise<WorkspaceSnapshotReplayBundle[]> {
  const rows = await repository.listSnapshots(subjectKind, subjectId, limit);
  return rows.map((row) => toBundle(row));
}
