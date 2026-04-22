import { buildCanonicalEventFixture } from '@elceo/schemas';
import { computeEventTemporalState } from '../core/event-recency';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runEventRecencyTests(): void {
  const asOf = '2026-01-01T00:00:00.000Z';
  const scheduledLow = buildCanonicalEventFixture({ status: 'scheduled', impact: 'low', occurredAt: '2026-01-01T04:00:00.000Z' });
  const scheduledCritical = buildCanonicalEventFixture({ status: 'scheduled', impact: 'critical', occurredAt: '2026-01-01T04:00:00.000Z' });

  const low = computeEventTemporalState(scheduledLow, asOf);
  const critical = computeEventTemporalState(scheduledCritical, asOf);
  assert(critical.recencyScore > low.recencyScore, 'future critical event decays slower than low impact');

  const news = computeEventTemporalState(buildCanonicalEventFixture({ eventKind: 'news', occurredAt: '2025-12-31T20:00:00.000Z' }), asOf);
  const macroContext = computeEventTemporalState(buildCanonicalEventFixture({ eventKind: 'macro_context', occurredAt: '2025-12-31T20:00:00.000Z' }), asOf);
  assert(news.recencyScore < macroContext.recencyScore, 'news decays faster than macro_context');

  const thresholdEdge = computeEventTemporalState(buildCanonicalEventFixture({ eventKind: 'news', occurredAt: '2025-12-31T00:00:00.000Z' }), asOf);
  const aboveThreshold = computeEventTemporalState(buildCanonicalEventFixture({ eventKind: 'news', occurredAt: '2025-12-30T23:59:59.000Z' }), asOf);
  assert(thresholdEdge.stale === false, 'exact threshold is not stale because condition is > threshold');
  assert(aboveThreshold.stale === true, 'beyond threshold is stale');
}
