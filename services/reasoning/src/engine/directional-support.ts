import type { BiasState, RankedEvidenceItem } from '@elceo/types';
import { clampTo100, roundScore } from '@elceo/domain';
import { sumEvidenceWeight } from './utils';

export type DirectionalSupport = {
  bullishWeight: number;
  bearishWeight: number;
  mixedWeight: number;
  neutralWeight: number;
  totalWeight: number;
  comparableDirectionalWeight: number;
  netDirectionalEdge: number;
  biasStrengthScore: number;
};

export function computeDirectionalSupport(evidence: RankedEvidenceItem[]): DirectionalSupport {
  const bullishWeight = sumEvidenceWeight(evidence, (item) => item.directionHint === 'bullish');
  const bearishWeight = sumEvidenceWeight(evidence, (item) => item.directionHint === 'bearish');
  const mixedWeight = sumEvidenceWeight(evidence, (item) => item.directionHint === 'mixed');
  const neutralWeight = sumEvidenceWeight(evidence, (item) => item.directionHint === 'neutral');

  const totalWeight = roundScore(bullishWeight + bearishWeight + mixedWeight + neutralWeight);
  const comparableDirectionalWeight = roundScore(bullishWeight + bearishWeight);
  const netDirectionalEdge = roundScore(bullishWeight - bearishWeight);
  const biasStrengthScore = comparableDirectionalWeight <= 0
    ? 0
    : roundScore(clampTo100((Math.abs(netDirectionalEdge) / comparableDirectionalWeight) * 100));

  return {
    bullishWeight,
    bearishWeight,
    mixedWeight,
    neutralWeight,
    totalWeight,
    comparableDirectionalWeight,
    netDirectionalEdge,
    biasStrengthScore
  };
}

export function selectBiasFromDirectionalSupport(directionalSupport: DirectionalSupport): BiasState {
  if (directionalSupport.comparableDirectionalWeight < 40) return 'neutral';
  if (Math.abs(directionalSupport.netDirectionalEdge) < 15) return 'neutral';
  if (directionalSupport.biasStrengthScore < 12) return 'neutral';
  if (directionalSupport.netDirectionalEdge > 0) return 'bullish';
  if (directionalSupport.netDirectionalEdge < 0) return 'bearish';
  return 'neutral';
}

export function buildBiasLabel(
  bias: BiasState,
  biasStrengthScore: number,
  confidenceScorePreview: number,
  contradictionScorePreview: number
): string {
  if (bias === 'neutral') {
    if (contradictionScorePreview >= 60) return 'Balanced / conflicted';
    return 'Neutral / awaiting resolution';
  }

  if (bias === 'bullish') {
    if (biasStrengthScore >= 60 && confidenceScorePreview >= 70) return 'Strong bullish';
    if (biasStrengthScore >= 35) return 'Moderate bullish';
    return 'Cautious bullish';
  }

  if (biasStrengthScore >= 60 && confidenceScorePreview >= 70) return 'Strong bearish';
  if (biasStrengthScore >= 35) return 'Moderate bearish';
  return 'Cautious bearish';
}
