import {
  validateSnapshotFreshnessRecord,
  validateSnapshotRefreshRunReport
} from '@elceo/schemas';
import type { SnapshotFreshnessRecord, SnapshotRefreshRunReport } from '@elceo/types';

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch {
    throw new Error('invalid_refresh_runtime_json');
  }
}

export function serializeSnapshotRefreshRunReport(report: SnapshotRefreshRunReport): string {
  return JSON.stringify(report);
}

export function deserializeSnapshotRefreshRunReport(json: string): SnapshotRefreshRunReport {
  const parsed = parseJson(json);
  const validated = validateSnapshotRefreshRunReport(parsed);
  if (validated.ok === false) throw new Error(`invalid_snapshot_refresh_run_report:${validated.errors.join('; ')}`);
  return validated.value;
}

export function serializeSnapshotFreshnessRecord(record: SnapshotFreshnessRecord): string {
  return JSON.stringify(record);
}

export function deserializeSnapshotFreshnessRecord(json: string): SnapshotFreshnessRecord {
  const parsed = parseJson(json);
  const validated = validateSnapshotFreshnessRecord(parsed);
  if (validated.ok === false) throw new Error(`invalid_snapshot_freshness_record:${validated.errors.join('; ')}`);
  return validated.value;
}
