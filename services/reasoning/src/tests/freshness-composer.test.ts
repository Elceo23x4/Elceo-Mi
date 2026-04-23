import { buildCanonicalEventFixture, buildReasoningInputFrameFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { composeFreshnessState } from '../engine/freshness-composer.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runFreshnessComposerTests(): void {
  const input = buildReasoningInputFrameFixture({
    asOf: '2026-01-15T15:00:00.000Z',
    events: [
      buildCanonicalEventFixture({ id: 'f1', occurredAt: '2026-01-15T12:00:00.000Z', detectedAt: '2026-01-15T12:10:00.000Z' }),
      buildCanonicalEventFixture({ id: 'f2', occurredAt: '2026-01-15T13:00:00.000Z', detectedAt: '2026-01-15T13:40:00.000Z' })
    ]
  });

  const freshness = composeFreshnessState(input);
  assert(freshness.lastMaterialUpdateAt === '2026-01-15T13:40:00.000Z', 'latest material update should use max(laterOf occurredAt/detectedAt)');
  assert(Math.abs(freshness.hoursSinceLastMaterialUpdate - 1.33) < 0.01, 'hoursSinceLastMaterialUpdate should be computed from asOf to latest material update');

  const noEvents = composeFreshnessState(buildReasoningInputFrameFixture({ asOf: '2026-01-15T15:00:00.000Z', events: [] }));
  assert(noEvents.lastMaterialUpdateAt === '2026-01-15T15:00:00.000Z', 'no events should use asOf as baseline timestamp');
  assert(noEvents.hoursSinceLastMaterialUpdate === 0, 'no events baseline should have zero hours since update');
}
