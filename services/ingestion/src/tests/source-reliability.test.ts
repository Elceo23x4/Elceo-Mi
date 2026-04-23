import { buildCanonicalEventFixture } from '@elceo/schemas';
import { getEffectiveSourceReliabilityScore } from '../core/source-reliability';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runSourceReliabilityTests(): void {
  const weighted = getEffectiveSourceReliabilityScore(
    buildCanonicalEventFixture({ sourceName: 'IMF', sourceCategory: 'macro_context', sourceReliabilityScore: 50 })
  );
  assert(weighted === 68.4, 'provider override + weighted formula should be deterministic');

  const fallback = getEffectiveSourceReliabilityScore(
    buildCanonicalEventFixture({ sourceName: 'Unknown Source', sourceCategory: 'news', sourceReliabilityScore: Number.NaN })
  );
  assert(fallback === 72, 'missing provided score should fallback to category default');

  const clamped = getEffectiveSourceReliabilityScore(
    buildCanonicalEventFixture({ sourceName: 'IMF', sourceCategory: 'macro_context', sourceReliabilityScore: 1000 })
  );
  assert(clamped === 96, 'invalid provided score should fallback and stay clamped');
}
