import type { InvalidationState, RankedEvidenceItem, ZoneSignificance } from '@elceo/types';

function numericKey(value: number): string {
  return `${value}`;
}

function uniqueOrderedNumbers(values: number[]): number[] {
  const seen = new Set<string>();
  const output: number[] = [];

  for (const value of values) {
    const key = numericKey(value);
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }

  return output;
}

export function buildEmphasisPriceLevels(params: {
  invalidation: InvalidationState;
  enrichedEvidence: RankedEvidenceItem[];
  zones: {
    primary: ZoneSignificance[];
    secondary: ZoneSignificance[];
  };
  recentPriceRange: { high: number; low: number; close: number };
}): number[] {
  const levels: number[] = [];

  if (params.invalidation.primary !== null) {
    levels.push(params.invalidation.primary.price);
  }

  for (const secondary of params.invalidation.secondary) {
    levels.push(secondary.price);
  }

  for (const zone of params.zones.primary) {
    levels.push(zone.midpoint);
  }

  for (const evidence of params.enrichedEvidence.slice(0, 5)) {
    for (const linkedLevel of evidence.linkedPriceLevels) {
      levels.push(linkedLevel);
    }
  }

  levels.push(params.recentPriceRange.close);
  levels.push(params.recentPriceRange.low);
  levels.push(params.recentPriceRange.high);

  return uniqueOrderedNumbers(levels).slice(0, 10);
}
