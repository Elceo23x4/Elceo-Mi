import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';

export function buildRunCompletedOutboxDedupeKey(runId: string): string {
  return `run_completed|${runId}`;
}

export function buildRunFailedOutboxDedupeKey(runId: string): string {
  return `run_failed|${runId}`;
}

export function buildEventSnapshotOutboxDedupeKey(runId: string, asset: CanonicalAssetSymbol, timeframe: Timeframe): string {
  return `event_snapshot|${runId}|${asset}|${timeframe}`;
}
