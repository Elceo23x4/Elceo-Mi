import { buildInvalidationStateFixture, buildRankedEvidenceItemFixture, buildZoneSignificanceFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { buildChartProjection } from '../engine/chart-projection-builder.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runChartProjectionBuilderTests(): void {
  const projection = buildChartProjection({
    contradictionScore: 35,
    invalidation: buildInvalidationStateFixture(),
    enrichedEvidence: [
      buildRankedEvidenceItemFixture({ evidenceId: 'e1', label: 'Driver 1', linkedZoneIds: ['zone-a'], finalRankScore: 90 }),
      buildRankedEvidenceItemFixture({ evidenceId: 'e2', label: 'Driver 2', linkedZoneIds: [], finalRankScore: 80 })
    ],
    zonesSection: {
      primary: [buildZoneSignificanceFixture({ zoneId: 'zone-a', midpoint: 100 })],
      secondary: [buildZoneSignificanceFixture({ zoneId: 'zone-b', midpoint: 99 })],
      activeZoneIds: ['zone-a', 'zone-b']
    },
    recentPriceRange: { high: 105, low: 95, close: 100 }
  });

  assert(projection.annotationIds[0] === 'annotation|e1|zone|zone-a', 'anchored evidence should emit zone annotation id');
  assert(projection.annotationIds[1] === 'annotation|e2|standalone', 'unanchored evidence should emit standalone annotation id');
  assert(projection.markerLabels[0] === 'Driver 1 · anchored', 'anchored marker label should include anchored suffix');
  assert(projection.markerLabels[1] === 'Driver 2 · standalone', 'standalone marker label should include standalone suffix');
  assert(projection.contradictionMarkerVisible === true, 'contradiction marker should be visible at threshold 35');
}
