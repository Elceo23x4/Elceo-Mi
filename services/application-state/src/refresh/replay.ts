import type { SnapshotFreshnessRecord, SnapshotRefreshRunReport } from '@elceo/types';
import type { SnapshotFreshnessRepository, SnapshotRefreshRunRepository } from '../persistence/contracts';
import { deserializeSnapshotFreshnessRecord, deserializeSnapshotRefreshRunReport } from './serialization';

export type SnapshotRefreshRunReplayBundle = {
  report: SnapshotRefreshRunReport;
  freshnessRecords: SnapshotFreshnessRecord[];
};

export async function getSnapshotRefreshRunReplayById(
  refreshRunId: string,
  refreshRunRepository: SnapshotRefreshRunRepository,
  freshnessRepository: SnapshotFreshnessRepository
): Promise<SnapshotRefreshRunReplayBundle | null> {
  const row = await refreshRunRepository.getRunById(refreshRunId);
  if (!row) return null;
  const report = deserializeSnapshotRefreshRunReport(row.reportJson);
  const freshness = await listSnapshotFreshnessReplay(report.subjectKind, report.subjectId, freshnessRepository);
  return { report, freshnessRecords: freshness };
}

export async function getLatestSnapshotRefreshRunReplay(
  subjectKind: 'user' | 'workspace' | 'ops',
  subjectId: string,
  refreshRunRepository: SnapshotRefreshRunRepository,
  freshnessRepository: SnapshotFreshnessRepository
): Promise<SnapshotRefreshRunReplayBundle | null> {
  const row = await refreshRunRepository.getLatestRun(subjectKind, subjectId);
  if (!row) return null;
  return getSnapshotRefreshRunReplayById(row.refreshRunId, refreshRunRepository, freshnessRepository);
}

export async function listSnapshotRefreshRunReplays(
  subjectKind: 'user' | 'workspace' | 'ops',
  subjectId: string,
  refreshRunRepository: SnapshotRefreshRunRepository,
  freshnessRepository: SnapshotFreshnessRepository,
  limit?: number
): Promise<SnapshotRefreshRunReplayBundle[]> {
  const runs = await refreshRunRepository.listRecentRuns(subjectKind, subjectId, limit);
  const freshness = await listSnapshotFreshnessReplay(subjectKind, subjectId, freshnessRepository);
  return runs.map((run) => ({ report: deserializeSnapshotRefreshRunReport(run.reportJson), freshnessRecords: freshness }));
}

export async function listSnapshotFreshnessReplay(
  subjectKind: 'user' | 'workspace' | 'ops',
  subjectId: string,
  freshnessRepository: SnapshotFreshnessRepository
): Promise<SnapshotFreshnessRecord[]> {
  const rows = await freshnessRepository.listFreshnessForSubject(subjectKind, subjectId);
  return rows.map((row) => deserializeSnapshotFreshnessRecord(JSON.stringify(row)));
}
