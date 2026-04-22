import { roundScore } from '@elceo/domain';
import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type { ProviderCapabilityDiagnostic } from '../facade/provider-capabilities';
import type { IngestionActiveBoundary, IngestionExecutionMode, IngestionRunStatus } from './execution-mode';
import type { IngestionTriggerKind } from '../scheduler/trigger-context';

export type IngestionRunComparison = {
  overlapDedupeKeyCount: number;
  canonicalOnlyCount: number;
  legacyOnlyCount: number;
  unionCount: number;
  overlapRatio: number;
};

export type IngestionRunReport = {
  runId: string;
  mode: IngestionExecutionMode;
  activeBoundary: IngestionActiveBoundary;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  status: IngestionRunStatus;
  canonicalEventCount: number;
  legacyEventCount: number | null;
  outputEventCount: number;
  fallbackApplied: boolean;
  fallbackReason: string | null;
  boundaryVersion: string;
  triggerKind: IngestionTriggerKind;
  requestKey: string;
  slotStartAt: string | null;
  slotEndAt: string | null;
  schedulerTickId: string | null;
  comparison: IngestionRunComparison | null;
  diagnosticsSummary: {
    adapterFailureCount: number;
    invalidEventCount: number;
    mergeCount: number;
    droppedEventCount: number;
  };
  providerCapabilities: ProviderCapabilityDiagnostic[];
};

export function computeOverlapRatio(overlapDedupeKeyCount: number, unionCount: number): number {
  if (unionCount === 0) return 100;
  return roundScore((overlapDedupeKeyCount / unionCount) * 100);
}
