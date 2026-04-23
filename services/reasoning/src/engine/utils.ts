import type { CanonicalEvent, RankedEvidenceItem, Timeframe } from '@elceo/types';
import { clampTo100, roundScore } from '@elceo/domain';

export const ADJACENT_TIMEFRAMES: Record<Timeframe, Timeframe[]> = {
  M5: ['M15'],
  M15: ['M5', 'H1'],
  H1: ['M15', 'H4'],
  H4: ['H1', 'D1'],
  D1: ['H4']
};

export function weightedAverage(values: Array<{ value: number; weight: number }>, defaultValue: number): number {
  if (values.length === 0) return defaultValue;
  const totalWeight = values.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) return defaultValue;
  const weightedSum = values.reduce((sum, entry) => sum + entry.value * entry.weight, 0);
  return roundScore(clampTo100(weightedSum / totalWeight));
}

export function sumEvidenceWeight(evidence: RankedEvidenceItem[], predicate: (item: RankedEvidenceItem) => boolean): number {
  return roundScore(evidence.filter(predicate).reduce((sum, item) => sum + item.finalRankScore, 0));
}

export function parseIsoOrThrow(iso: string, fieldName: string): number {
  const epoch = Date.parse(iso);
  if (Number.isNaN(epoch)) {
    throw new Error(`invalid_iso_${fieldName}`);
  }
  return epoch;
}

export function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function sortEvidenceByRank(evidence: RankedEvidenceItem[]): RankedEvidenceItem[] {
  return [...evidence].sort((a, b) => {
    if (b.finalRankScore !== a.finalRankScore) return b.finalRankScore - a.finalRankScore;
    if (b.impactScore !== a.impactScore) return b.impactScore - a.impactScore;
    return a.evidenceId.localeCompare(b.evidenceId);
  });
}

export function precisionFromRange(range: { high: number; low: number; close: number }): number {
  const candidates = [range.high, range.low, range.close]
    .map((value) => {
      const text = `${value}`;
      const idx = text.indexOf('.');
      return idx >= 0 ? text.length - idx - 1 : 0;
    });
  return Math.max(...candidates, 0);
}

export function roundToPrecision(value: number, precision: number): number {
  if (precision <= 0) return roundScore(value);
  return Number(value.toFixed(precision));
}

export function maxEventMaterialTime(events: CanonicalEvent[], asOf: string): { lastMaterialUpdateAt: string; hoursSinceLastMaterialUpdate: number } {
  if (events.length === 0) {
    return {
      lastMaterialUpdateAt: asOf,
      hoursSinceLastMaterialUpdate: 0
    };
  }

  const latestEpoch = Math.max(
    ...events.map((event) => {
      const occurredAt = parseIsoOrThrow(event.occurredAt, 'event_occurredAt');
      const detectedAt = parseIsoOrThrow(event.detectedAt, 'event_detectedAt');
      return Math.max(occurredAt, detectedAt);
    })
  );

  const asOfEpoch = parseIsoOrThrow(asOf, 'asOf');
  const hours = Math.max(0, roundScore((asOfEpoch - latestEpoch) / 3_600_000));
  return {
    lastMaterialUpdateAt: new Date(latestEpoch).toISOString(),
    hoursSinceLastMaterialUpdate: hours
  };
}
