import { computeContradictionWeightedScore, mapContradictionRegime } from '@elceo/domain';
import { buildCanonicalEventFixture, buildRankedEvidenceItemFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { composeContradictionAnatomy } from '../engine/contradiction-composer.js';
import { computeDirectionalSupport } from '../engine/directional-support.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runContradictionComposerTests(): void {
  const evidence = [
    buildRankedEvidenceItemFixture({ evidenceId: 'e1', kind: 'macro_calendar', directionHint: 'bullish', finalRankScore: 60, priceProximityScore: 70 }),
    buildRankedEvidenceItemFixture({ evidenceId: 'e2', kind: 'macro_context', directionHint: 'bearish', finalRankScore: 40, priceProximityScore: 45 }),
    buildRankedEvidenceItemFixture({ evidenceId: 'e3', kind: 'news', directionHint: 'mixed', finalRankScore: 30, priceProximityScore: 55 })
  ];

  const events = [
    buildCanonicalEventFixture({ id: 'evt1', relevanceScore: 90, relatedTimeframes: ['H1'] }),
    buildCanonicalEventFixture({ id: 'evt2', relevanceScore: 50, relatedTimeframes: ['M15'] }),
    buildCanonicalEventFixture({ id: 'evt3', relevanceScore: 20, relatedTimeframes: [] })
  ];

  const directionalSupport = computeDirectionalSupport(evidence);

  const neutral = composeContradictionAnatomy({
    bias: 'neutral',
    evidence,
    events,
    timeframe: 'H1',
    directionalSupport
  });

  const expectedNarrative = ((30 + 0) / 130) * 100;
  assert(Math.abs(neutral.narrativeConflict - expectedNarrative) < 0.01, 'narrativeConflict formula must match exact definition');

  const expectedMacro = ((40 + 30) / 130) * 100;
  assert(Math.abs(neutral.macroConflict - expectedMacro) < 0.01, 'macroConflict formula must match exact definition');

  const expectedEventNeutral = (40 / 60) * 100;
  assert(Math.abs(neutral.eventConflict - expectedEventNeutral) < 0.01, 'eventConflict neutral formula must match exact definition');

  const directional = composeContradictionAnatomy({
    bias: 'bullish',
    evidence,
    events,
    timeframe: 'H1',
    directionalSupport
  });

  const expectedEventDirectional = (40 / 100) * 100;
  assert(Math.abs(directional.eventConflict - expectedEventDirectional) < 0.01, 'eventConflict directional formula must match exact definition');

  const expectedTimeframe = ((0 * 90) + (35 * 50) + (20 * 20)) / (90 + 50 + 20);
  assert(Math.abs(neutral.timeframeConflict - expectedTimeframe) < 0.01, 'timeframeConflict adjacency rules must be exact');

  const expectedWeighted = computeContradictionWeightedScore({
    narrativeConflict: neutral.narrativeConflict,
    priceConflict: neutral.priceConflict,
    eventConflict: neutral.eventConflict,
    macroConflict: neutral.macroConflict,
    timeframeConflict: neutral.timeframeConflict
  });
  assert(neutral.weightedScore === expectedWeighted, 'weighted contradiction score must use frozen helper');
  assert(neutral.regime === mapContradictionRegime(expectedWeighted), 'regime mapping must use frozen helper');
}
