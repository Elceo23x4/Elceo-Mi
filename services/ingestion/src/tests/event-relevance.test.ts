import { buildCanonicalEventFixture } from '@elceo/schemas';
import type { CanonicalEvent } from '@elceo/types';
import { computeEventRelevanceScore } from '../core/event-relevance';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function withBase(overrides: Partial<CanonicalEvent>): CanonicalEvent {
  return buildCanonicalEventFixture({
    recencyScore: 80,
    sourceReliabilityScore: 80,
    relatedTimeframes: ['H1'],
    relatedAssets: ['EUR/USD'],
    eventKind: 'macro_calendar',
    ...overrides
  });
}

export function runEventRelevanceTests(): void {
  const exact = computeEventRelevanceScore(withBase({ relatedAssets: ['EUR/USD'] }), 'EUR/USD', 'H1', '2026-01-01T00:00:00.000Z');
  const regionOnly = computeEventRelevanceScore(withBase({ relatedAssets: [], region: 'EU', currency: null }), 'EUR/USD', 'H1', '2026-01-01T00:00:00.000Z');
  assert(exact > regionOnly, 'exact asset match should outrank region-only relevance');

  const fxMacro = computeEventRelevanceScore(withBase({ eventKind: 'macro_calendar' }), 'EUR/USD', 'H1', '2026-01-01T00:00:00.000Z');
  const cryptoMacro = computeEventRelevanceScore(withBase({ eventKind: 'macro_calendar' }), 'BTC/USD', 'H1', '2026-01-01T00:00:00.000Z');
  assert(fxMacro > cryptoMacro, 'FX macro_calendar should score higher than crypto macro_calendar');

  const geoForGold = computeEventRelevanceScore(withBase({ eventKind: 'geopolitics', relatedAssets: ['XAU/USD'] }), 'XAU/USD', 'H1', '2026-01-01T00:00:00.000Z');
  const geoForBtc = computeEventRelevanceScore(withBase({ eventKind: 'geopolitics', relatedAssets: ['BTC/USD'] }), 'BTC/USD', 'H1', '2026-01-01T00:00:00.000Z');
  assert(geoForGold > geoForBtc, 'geopolitics should score stronger for XAU/USD than BTC/USD');

  const exactTf = computeEventRelevanceScore(withBase({ relatedTimeframes: ['H1'] }), 'EUR/USD', 'H1', '2026-01-01T00:00:00.000Z');
  const adjacentTf = computeEventRelevanceScore(withBase({ relatedTimeframes: ['M15'] }), 'EUR/USD', 'H1', '2026-01-01T00:00:00.000Z');
  const unrelatedTf = computeEventRelevanceScore(withBase({ relatedTimeframes: ['D1'] }), 'EUR/USD', 'H1', '2026-01-01T00:00:00.000Z');
  assert(exactTf > adjacentTf && adjacentTf > unrelatedTf, 'timeframe exact > adjacent > unrelated');
}
