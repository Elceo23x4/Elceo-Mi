import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type { IngestionExecutionMode } from '../runtime/execution-mode';
import type { IngestionScheduleFrequency } from './frequency';

export function buildScheduledRequestKey(
  asset: CanonicalAssetSymbol,
  timeframe: Timeframe,
  frequency: IngestionScheduleFrequency | string,
  slotStartIso: string,
  mode: IngestionExecutionMode
): string {
  return `scheduled|${asset}|${timeframe}|${frequency}|${slotStartIso}|${mode}`;
}

export function buildManualRequestKey(asset: CanonicalAssetSymbol, timeframe: Timeframe, requestedAtIso: string): string {
  return `manual|${asset}|${timeframe}|${requestedAtIso}`;
}

export function buildReplayRequestKey(asset: CanonicalAssetSymbol, timeframe: Timeframe, runReference: string): string {
  return `replay|${asset}|${timeframe}|${runReference}`;
}
