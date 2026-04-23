import { buildRankedEvidenceItemFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { computeDirectionalSupport, selectBiasFromDirectionalSupport } from '../engine/directional-support.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runDirectionalSupportTests(): void {
  const lowComparable = computeDirectionalSupport([
    buildRankedEvidenceItemFixture({ directionHint: 'bullish', finalRankScore: 20 }),
    buildRankedEvidenceItemFixture({ directionHint: 'bearish', finalRankScore: 10, evidenceId: 'ev-b' })
  ]);
  assert(selectBiasFromDirectionalSupport(lowComparable) === 'neutral', 'low comparableDirectionalWeight should be neutral');

  const smallEdge = computeDirectionalSupport([
    buildRankedEvidenceItemFixture({ directionHint: 'bullish', finalRankScore: 35 }),
    buildRankedEvidenceItemFixture({ directionHint: 'bearish', finalRankScore: 25, evidenceId: 'ev-b2' })
  ]);
  assert(selectBiasFromDirectionalSupport(smallEdge) === 'neutral', 'small net edge should be neutral');

  const bullish = computeDirectionalSupport([
    buildRankedEvidenceItemFixture({ directionHint: 'bullish', finalRankScore: 65 }),
    buildRankedEvidenceItemFixture({ directionHint: 'bearish', finalRankScore: 25, evidenceId: 'ev-b3' })
  ]);
  assert(selectBiasFromDirectionalSupport(bullish) === 'bullish', 'sufficient bullish edge should be bullish');

  const bearish = computeDirectionalSupport([
    buildRankedEvidenceItemFixture({ directionHint: 'bullish', finalRankScore: 20 }),
    buildRankedEvidenceItemFixture({ directionHint: 'bearish', finalRankScore: 75, evidenceId: 'ev-b4' })
  ]);
  assert(selectBiasFromDirectionalSupport(bearish) === 'bearish', 'sufficient bearish edge should be bearish');
}
