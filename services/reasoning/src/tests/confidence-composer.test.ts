import { computeConfidenceWeightedScore } from '@elceo/domain';
import { buildRankedEvidenceItemFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { composeConfidenceAnatomy } from '../engine/confidence-composer.js';
import { computeDirectionalSupport } from '../engine/directional-support.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runConfidenceComposerTests(): void {
  const evidence = [
    buildRankedEvidenceItemFixture({ evidenceId: 'c1', directionHint: 'bullish', finalRankScore: 60, sourceReliabilityScore: 80, priceProximityScore: 70 }),
    buildRankedEvidenceItemFixture({ evidenceId: 'c2', directionHint: 'bearish', finalRankScore: 20, sourceReliabilityScore: 50, priceProximityScore: 40 }),
    buildRankedEvidenceItemFixture({ evidenceId: 'c3', directionHint: 'mixed', finalRankScore: 20, sourceReliabilityScore: 90, priceProximityScore: 60 })
  ];

  const directionalSupport = computeDirectionalSupport(evidence);
  const contradictionAnatomy = {
    narrativeConflict: 10,
    priceConflict: 20,
    eventConflict: 30,
    macroConflict: 40,
    timeframeConflict: 50,
    weightedScore: 35,
    regime: 'moderate' as const,
    componentsVersion: 'x'
  };
  const freshnessState = {
    freshnessScore: 80,
    hoursSinceLastMaterialUpdate: 5,
    lastMaterialUpdateAt: '2026-01-01T00:00:00.000Z',
    decayRatePerHour: 4,
    stale: false,
    staleThresholdHours: 24,
    componentsVersion: 'x'
  };

  const neutral = composeConfidenceAnatomy({ bias: 'neutral', evidence, directionalSupport, contradictionAnatomy, freshnessState });
  assert(Math.abs(neutral.sourceIntegrity - 76) < 0.01, 'sourceIntegrity weighted average must be exact');
  assert(Math.abs(neutral.eventAlignment - (100 - directionalSupport.biasStrengthScore)) < 0.01, 'neutral eventAlignment must be 100-biasStrength');

  const directional = composeConfidenceAnatomy({ bias: 'bullish', evidence, directionalSupport, contradictionAnatomy, freshnessState });
  assert(Math.abs(directional.eventAlignment - 60) < 0.01, 'directional eventAlignment must match aligned/comparable formula');
  assert(Math.abs(directional.priceAcceptance - 70) < 0.01, 'directional priceAcceptance must be aligned average');
  assert(Math.abs(neutral.priceAcceptance - 62) < 0.01, 'neutral priceAcceptance must be all-evidence weighted average');

  const expectedWeighted = computeConfidenceWeightedScore({
    sourceIntegrity: directional.sourceIntegrity,
    eventAlignment: directional.eventAlignment,
    priceAcceptance: directional.priceAcceptance,
    contradictionPenalty: directional.contradictionPenalty,
    stalenessPenalty: directional.stalenessPenalty
  });
  assert(directional.weightedScore === expectedWeighted, 'confidence weighted score must use frozen helper');
}
