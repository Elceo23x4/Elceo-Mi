import { validateAnalyticsSnapshot, validateAnalyticsSnapshotSummary } from '@elceo/schemas';
import type { AnalyticsSnapshot, AnalyticsSnapshotSummary } from '@elceo/types';

function parseJson(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch {
    throw new Error('malformed_json');
  }
}

export function serializeAnalyticsSnapshotSummary(summary: AnalyticsSnapshotSummary): string {
  return JSON.stringify(summary);
}

export function deserializeAnalyticsSnapshotSummary(json: string): AnalyticsSnapshotSummary {
  const parsed = parseJson(json);
  const validated = validateAnalyticsSnapshotSummary(parsed);
  if (validated.ok === false) throw new Error(`invalid_analytics_snapshot_summary:${validated.errors.join('; ')}`);
  return validated.value;
}

export function serializeAnalyticsSnapshot(snapshot: AnalyticsSnapshot): string {
  return JSON.stringify(snapshot);
}

export function deserializeAnalyticsSnapshot(json: string): AnalyticsSnapshot {
  const parsed = parseJson(json);
  const validated = validateAnalyticsSnapshot(parsed);
  if (validated.ok === false) throw new Error(`invalid_analytics_snapshot:${validated.errors.join('; ')}`);
  return validated.value;
}
