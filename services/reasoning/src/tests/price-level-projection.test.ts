import { buildInvalidationStateFixture, buildRankedEvidenceItemFixture, buildZoneSignificanceFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { buildEmphasisPriceLevels } from '../engine/price-level-projection.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runPriceLevelProjectionTests(): void {
  const levels = buildEmphasisPriceLevels({
    invalidation: buildInvalidationStateFixture({
      primary: { ...buildInvalidationStateFixture().primary!, price: 100 },
      secondary: [
        { ...buildInvalidationStateFixture().primary!, invalidationId: 'inv-2', price: 99 },
        { ...buildInvalidationStateFixture().primary!, invalidationId: 'inv-3', price: 98 }
      ]
    }),
    enrichedEvidence: [
      buildRankedEvidenceItemFixture({ evidenceId: 'e1', linkedPriceLevels: [96, 95] }),
      buildRankedEvidenceItemFixture({ evidenceId: 'e2', linkedPriceLevels: [95, 94] }),
      buildRankedEvidenceItemFixture({ evidenceId: 'e3', linkedPriceLevels: [93] })
    ],
    zones: {
      primary: [buildZoneSignificanceFixture({ midpoint: 97 }), buildZoneSignificanceFixture({ zoneId: 'z2', midpoint: 96 })],
      secondary: [buildZoneSignificanceFixture({ zoneId: 'z3', midpoint: 92 })]
    },
    recentPriceRange: { close: 101, low: 90, high: 110 }
  });

  assert(levels[0] === 100, 'primary invalidation price should come first');
  assert(levels[1] === 99 && levels[2] === 98, 'secondary invalidation prices should preserve order');
  assert(levels.includes(97), 'primary zone midpoint should be included');
  assert(levels.includes(96), 'linked evidence levels should follow and dedupe exactly');
  assert(levels.length <= 10, 'levels should be capped to 10 unique values');
}
