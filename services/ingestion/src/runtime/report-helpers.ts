import { randomUUID } from 'node:crypto';
import type { CanonicalEvent } from '@elceo/types';
import type { CompositeIngestionDiagnostics } from '../core/event-diagnostics';
import type { IngestionActiveBoundary, IngestionRunStatus } from './execution-mode';
import { computeOverlapRatio, type IngestionRunComparison } from './run-report';

export function createIngestionRunId(): string {
  return `ing-${randomUUID()}`;
}

export function summarizeDiagnostics(diagnostics: CompositeIngestionDiagnostics): {
  adapterFailureCount: number;
  invalidEventCount: number;
  mergeCount: number;
  droppedEventCount: number;
} {
  return {
    adapterFailureCount: diagnostics.adapterFailures.length,
    invalidEventCount: diagnostics.invalidEvents.length,
    mergeCount: diagnostics.merges.length,
    droppedEventCount: diagnostics.droppedEvents.length
  };
}

export function buildComparisonFromCanonicalAndLegacy(canonicalEvents: CanonicalEvent[], legacyEvents: CanonicalEvent[]): IngestionRunComparison {
  const canonicalKeys = new Set(canonicalEvents.map((item) => item.dedupeKey));
  const legacyKeys = new Set(legacyEvents.map((item) => item.dedupeKey));

  let overlapDedupeKeyCount = 0;
  for (const key of canonicalKeys) {
    if (legacyKeys.has(key)) overlapDedupeKeyCount += 1;
  }

  const canonicalOnlyCount = [...canonicalKeys].filter((key) => !legacyKeys.has(key)).length;
  const legacyOnlyCount = [...legacyKeys].filter((key) => !canonicalKeys.has(key)).length;
  const unionCount = canonicalOnlyCount + legacyOnlyCount + overlapDedupeKeyCount;

  return {
    overlapDedupeKeyCount,
    canonicalOnlyCount,
    legacyOnlyCount,
    unionCount,
    overlapRatio: computeOverlapRatio(overlapDedupeKeyCount, unionCount)
  };
}

export function computeRunStatus(params: { activeBoundary: IngestionActiveBoundary; fallbackApplied: boolean; partialFlag: boolean }): IngestionRunStatus {
  if (params.activeBoundary === 'none') return 'failed';
  if (params.fallbackApplied || params.partialFlag) return 'partial_success';
  return 'success';
}
