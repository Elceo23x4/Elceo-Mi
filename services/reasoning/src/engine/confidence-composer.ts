import { clampTo100, computeConfidenceWeightedScore, roundScore } from '@elceo/domain';
import type { BiasState, ConfidenceAnatomy, FreshnessState, RankedEvidenceItem } from '@elceo/types';
import { REASONING_COMPONENTS_VERSION } from './constants';
import type { DirectionalSupport } from './directional-support';
import type { ContradictionAnatomy } from '@elceo/types';
import { weightedAverage } from './utils';

export function composeConfidenceAnatomy(params: {
  bias: BiasState;
  evidence: RankedEvidenceItem[];
  directionalSupport: DirectionalSupport;
  contradictionAnatomy: ContradictionAnatomy;
  freshnessState: FreshnessState;
}): ConfidenceAnatomy {
  const { bias, evidence, directionalSupport, contradictionAnatomy, freshnessState } = params;

  const sourceIntegrity = weightedAverage(
    evidence.map((item) => ({ value: item.sourceReliabilityScore, weight: item.finalRankScore })),
    50
  );

  let eventAlignment = 50;
  if (bias === 'neutral') {
    eventAlignment = roundScore(clampTo100(100 - directionalSupport.biasStrengthScore));
  } else {
    const alignedWeight = bias === 'bullish' ? directionalSupport.bullishWeight : directionalSupport.bearishWeight;
    const comparableWeight = directionalSupport.bullishWeight + directionalSupport.bearishWeight + directionalSupport.mixedWeight;
    eventAlignment = comparableWeight <= 0 ? 50 : roundScore(clampTo100((alignedWeight / comparableWeight) * 100));
  }

  let priceAcceptance = 50;
  if (bias === 'neutral') {
    priceAcceptance = weightedAverage(
      evidence.map((item) => ({ value: item.priceProximityScore, weight: item.finalRankScore })),
      50
    );
  } else {
    const alignedEvidence = evidence.filter((item) => item.directionHint === bias);
    const allAverage = weightedAverage(
      evidence.map((item) => ({ value: item.priceProximityScore, weight: item.finalRankScore })),
      50
    );
    priceAcceptance = weightedAverage(
      alignedEvidence.map((item) => ({ value: item.priceProximityScore, weight: item.finalRankScore })),
      allAverage
    );
  }

  const contradictionPenalty = contradictionAnatomy.weightedScore;
  const stalenessPenalty = roundScore(clampTo100(100 - freshnessState.freshnessScore));

  const weightedScore = computeConfidenceWeightedScore({
    sourceIntegrity,
    eventAlignment,
    priceAcceptance,
    contradictionPenalty,
    stalenessPenalty
  });

  return {
    sourceIntegrity,
    eventAlignment,
    priceAcceptance,
    contradictionPenalty,
    stalenessPenalty,
    weightedScore,
    componentsVersion: REASONING_COMPONENTS_VERSION
  };
}
