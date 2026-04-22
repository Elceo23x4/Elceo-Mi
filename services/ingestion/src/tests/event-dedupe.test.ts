import { buildCanonicalEventFixture } from '@elceo/schemas';
import { buildCanonicalEventDedupeKey, floorIsoToBucket, mergeDuplicateCanonicalEvents, normalizeTitleForDedupe } from '../core/event-dedupe';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runEventDedupeTests(): void {
  const slug = normalizeTitleForDedupe('  CPI!!!    Surprise,  BIG move.  ');
  assert(slug === 'cpi-surprise-big-move', 'title normalization should collapse punctuation and whitespace');

  const base = buildCanonicalEventFixture({
    sourceCategory: 'news',
    eventKind: 'news',
    title: 'Fed signals caution!',
    occurredAt: '2026-01-01T10:22:00.000Z',
    relatedAssets: ['EUR/USD'],
    region: 'US',
    currency: 'USD'
  });

  const alt = buildCanonicalEventFixture({
    ...base,
    id: 'evt-2',
    sourceName: 'NewsAPI',
    sourceId: 'src-2',
    title: 'Fed signals caution'
  });

  assert(buildCanonicalEventDedupeKey(base) === buildCanonicalEventDedupeKey(alt), 'same logical event should dedupe to same key');
  assert(floorIsoToBucket('2026-01-01T10:22:59.000Z', 30) === '2026-01-01T10:00:00.000Z', 'time bucketing should floor in UTC');
}

export function runEventMergeTests(): void {
  const eventA = buildCanonicalEventFixture({
    id: 'a',
    sourceName: 'AlphaVantage',
    sourceCategory: 'news',
    eventKind: 'news',
    sourceReliabilityScore: 10,
    impact: 'medium',
    status: 'published',
    detectedAt: '2026-01-01T10:05:00.000Z',
    relatedAssets: ['EUR/USD', 'USD/JPY'],
    relatedTimeframes: ['H1'],
    tags: ['a']
  });

  const eventB = buildCanonicalEventFixture({
    ...eventA,
    id: 'b',
    sourceName: 'IMF',
    sourceCategory: 'news',
    sourceReliabilityScore: 100,
    impact: 'high',
    status: 'live',
    detectedAt: '2026-01-01T10:06:00.000Z',
    relatedAssets: ['USD/JPY', 'EUR/USD'],
    relatedTimeframes: ['M15', 'H1'],
    tags: ['b']
  });

  const eventC = buildCanonicalEventFixture({
    ...eventA,
    id: 'c',
    sourceName: 'FRED',
    sourceCategory: 'news',
    sourceReliabilityScore: 60,
    impact: 'high',
    status: 'revised',
    detectedAt: '2026-01-01T10:06:00.000Z',
    tags: ['c']
  });

  const merged = mergeDuplicateCanonicalEvents([eventA, eventB, eventC], 'EUR/USD', 'H1', '2026-01-01T11:00:00.000Z');
  assert(merged.mergedEvents.length === 1, 'duplicate group should merge into single event');
  const mergeDiagnostic = merged.merges[0];
  const mergedEvent = merged.mergedEvents[0];
  if (!mergeDiagnostic || !mergedEvent) throw new Error('Expected merged output to exist');
  assert(mergeDiagnostic.primaryEventId === 'b', 'primary selection reliability > impact > detectedAt > sourceName');
  assert(mergedEvent.confirmationCount === 3, 'confirmation count should equal group size');
  assert(mergedEvent.relatedAssets.join(',') === 'EUR/USD,USD/JPY', 'relatedAssets should be unioned and sorted');
  assert(mergedEvent.status === 'live', 'status precedence should pick live');
  assert(mergedEvent.impact === 'high', 'impact precedence should pick highest severity');
}
