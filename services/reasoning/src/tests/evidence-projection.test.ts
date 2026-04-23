import { buildCanonicalCognitionStateFixture, buildCanonicalEventFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { buildRankedEvidenceCandidates, computeConfirmationScore, computeContradictionContributionScore, projectCanonicalEventToEvidenceItem } from '../input/evidence-projection.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runEvidenceProjectionTests(): void {
  const event = buildCanonicalEventFixture({
    impact: 'critical',
    confirmationCount: 6,
    tags: ['bullish'],
    relevanceScore: 80,
    sourceReliabilityScore: 70,
    recencyScore: 60,
    relatedAssets: ['XAU/USD'],
    eventKind: 'price_action'
  });
  const projected = projectCanonicalEventToEvidenceItem({ event, targetAsset: 'XAU/USD', targetTimeframe: 'H1', latestPrice: 2000, priorCognition: null });
  assert(projected.impactScore === 95, 'impact score mapping must be exact');
  assert(computeConfirmationScore(0) === 0 && computeConfirmationScore(1) === 20 && computeConfirmationScore(5) === 100 && computeConfirmationScore(9) === 100, 'confirmation mapping exact');
  assert(projected.directionHint === 'bullish', 'direction hint tag logic exact');

  const neutralPrior = buildCanonicalCognitionStateFixture({ bias: 'neutral' });
  assert(computeContradictionContributionScore('bullish', null) === 25, 'contradiction no prior exact');
  assert(computeContradictionContributionScore('bullish', neutralPrior) === 25, 'contradiction prior neutral exact');
  assert(computeContradictionContributionScore('bullish', buildCanonicalCognitionStateFixture({ bias: 'bullish' })) === 10, 'same bias exact');
  assert(computeContradictionContributionScore('bullish', buildCanonicalCognitionStateFixture({ bias: 'bearish' })) === 85, 'opposing bias exact');
  assert(computeContradictionContributionScore('mixed', buildCanonicalCognitionStateFixture({ bias: 'bearish' })) === 70, 'mixed exact');

  assert(projected.finalRankScore === 80.5, 'finalRankScore formula exact for test fixture');

  const sorted = buildRankedEvidenceCandidates(
    [
      buildCanonicalEventFixture({ id: 'b', relevanceScore: 20, impact: 'low', sourceReliabilityScore: 20, recencyScore: 20 }),
      buildCanonicalEventFixture({ id: 'a', relevanceScore: 90, impact: 'high', sourceReliabilityScore: 90, recencyScore: 90 })
    ],
    'XAU/USD',
    'H1',
    2000,
    null
  );
  assert(sorted[0]?.eventId === 'a', 'evidence sort order exact');
}
