import { buildRankedEvidenceItemFixture, buildZoneSignificanceFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { buildExplanation } from '../engine/explanation-builder.js';
import { composeInvalidationState } from '../engine/invalidation-composer.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runExplanationBuilderTests(): void {
  const evidence = [
    buildRankedEvidenceItemFixture({ evidenceId: 'x1', label: 'Driver 1', explanation: 'Support 1', directionHint: 'bullish', finalRankScore: 90, linkedZoneIds: [] }),
    buildRankedEvidenceItemFixture({ evidenceId: 'x2', label: 'Driver 2', explanation: 'Support 2', directionHint: 'bullish', finalRankScore: 80, linkedZoneIds: ['zone-h1-1'] }),
    buildRankedEvidenceItemFixture({ evidenceId: 'x3', label: 'Driver 3', explanation: 'Oppose 1', directionHint: 'bearish', finalRankScore: 70, linkedZoneIds: ['zone-h1-2'] }),
    buildRankedEvidenceItemFixture({ evidenceId: 'x4', label: 'Driver 4', explanation: 'Mixed 1', directionHint: 'mixed', finalRankScore: 60, linkedZoneIds: [] })
  ];

  const invalidation = composeInvalidationState({
    asset: 'XAU/USD',
    timeframe: 'H1',
    bias: 'bullish',
    confidenceScore: 75,
    contradictionScore: 40,
    freshnessScore: 80,
    recentPriceRange: { low: 100, high: 120, close: 110 },
    evidence,
    zones: [buildZoneSignificanceFixture()]
  });

  const explanation = buildExplanation({
    bias: 'bullish',
    biasLabel: 'Moderate bullish',
    confidenceScore: 75,
    contradictionScore: 40,
    contradictionRegime: 'moderate',
    freshnessScore: 80,
    evidence,
    enrichedEvidence: evidence,
    invalidation,
    zones: [buildZoneSignificanceFixture()],
    recentPriceRange: { low: 100, high: 120, close: 110 },
    zoneConfluenceSummary: {
      activeAnchoredZoneIds: ['zone-h1-2', 'zone-h1-1'],
      strongestAnchoredZoneId: 'zone-h1-2',
      strongestAnchoredLinkScore: 88,
      anchoredEvidenceCount: 2,
      bullishAnchoredCount: 1,
      bearishAnchoredCount: 1,
      neutralOrMixedAnchoredCount: 0
    }
  });

  assert(explanation.concise === 'Moderate bullish with 75 confidence, moderate contradiction, and 4 ranked evidence items.', 'concise format should be deterministic');
  assert(explanation.supportingReasons[0] === 'Support 2', 'anchored supporting evidence should be prioritized');
  assert(explanation.contradictoryReasons[0] === 'Oppose 1', 'anchored contradictory evidence should be prioritized');
  assert(explanation.expanded.includes('The strongest current zone confluence is zone-h1-2.'), 'expanded should append strongest zone confluence sentence');
  assert(explanation.whatWouldChangeState.some((item) => item.includes('zone-h1-2')), 'whatWouldChangeState should include zone confluence failure sentence');
}
