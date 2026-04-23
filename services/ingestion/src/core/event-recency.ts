import { clampTo100, roundScore } from '@elceo/domain';
import type { CanonicalEvent, EventImpactLevel, EvidenceKind } from '@elceo/types';

const DECAY_RATE_BY_EVIDENCE_KIND: Record<EvidenceKind, number> = {
  market_structure: 2.0,
  price_action: 3.0,
  macro_calendar: 4.0,
  macro_context: 1.0,
  news: 6.0,
  geopolitics: 3.0,
  sentiment: 8.0,
  volume: 5.0,
  volatility: 5.0,
  zone_reaction: 2.0,
  cross_asset: 4.0,
  journal_behavior: 0.5,
  system: 12.0
};

const STALE_THRESHOLD_HOURS_BY_EVIDENCE_KIND: Record<EvidenceKind, number> = {
  market_structure: 48,
  price_action: 24,
  macro_calendar: 72,
  macro_context: 168,
  news: 24,
  geopolitics: 72,
  sentiment: 12,
  volume: 12,
  volatility: 12,
  zone_reaction: 48,
  cross_asset: 48,
  journal_behavior: 720,
  system: 24
};

function parseIsoMs(iso: string): number | null {
  const millis = Date.parse(iso);
  return Number.isNaN(millis) ? null : millis;
}

function hoursBetween(fromMs: number, toMs: number): number {
  return Math.max(0, (toMs - fromMs) / (1000 * 60 * 60));
}

function getFutureImminenceScore(impact: EventImpactLevel, hoursUntilEvent: number): number {
  if (impact === 'low') return clampTo100(roundScore(100 - 8 * hoursUntilEvent));
  if (impact === 'medium') return clampTo100(roundScore(100 - 5 * hoursUntilEvent));
  if (impact === 'high') return clampTo100(roundScore(100 - 3 * hoursUntilEvent));
  return clampTo100(roundScore(100 - 1.5 * hoursUntilEvent));
}

export function getDecayRateForEvidenceKind(kind: EvidenceKind): number {
  return DECAY_RATE_BY_EVIDENCE_KIND[kind];
}

export function getStaleThresholdForEvidenceKind(kind: EvidenceKind): number {
  return STALE_THRESHOLD_HOURS_BY_EVIDENCE_KIND[kind];
}

export function computeEventTemporalState(event: Pick<CanonicalEvent, 'status' | 'occurredAt' | 'detectedAt' | 'impact' | 'eventKind'>, asOf: string): {
  recencyScore: number;
  freshnessHours: number;
  stale: boolean;
} {
  const asOfMs = parseIsoMs(asOf) ?? Date.now();
  const occurredAtMs = parseIsoMs(event.occurredAt);
  const detectedAtMs = parseIsoMs(event.detectedAt);
  const referenceMs = occurredAtMs ?? detectedAtMs ?? asOfMs;

  if (event.status === 'scheduled' && referenceMs > asOfMs) {
    const hoursUntilEvent = hoursBetween(asOfMs, referenceMs);
    return {
      recencyScore: getFutureImminenceScore(event.impact, hoursUntilEvent),
      freshnessHours: 0,
      stale: false
    };
  }

  const hoursSinceEvent = hoursBetween(referenceMs, asOfMs);
  const decayRate = getDecayRateForEvidenceKind(event.eventKind);
  const staleThresholdHours = getStaleThresholdForEvidenceKind(event.eventKind);

  return {
    recencyScore: clampTo100(roundScore(100 - decayRate * hoursSinceEvent)),
    freshnessHours: roundScore(hoursSinceEvent),
    stale: hoursSinceEvent > staleThresholdHours
  };
}
