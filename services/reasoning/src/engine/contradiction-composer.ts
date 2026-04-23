import { clampTo100, computeContradictionWeightedScore, mapContradictionRegime, roundScore } from '@elceo/domain';
import type { BiasState, CanonicalEvent, ContradictionAnatomy, RankedEvidenceItem, Timeframe } from '@elceo/types';
import { REASONING_COMPONENTS_VERSION } from './constants';
import type { DirectionalSupport } from './directional-support';
import { ADJACENT_TIMEFRAMES, weightedAverage } from './utils';

const MACRO_KINDS = new Set(['macro_calendar', 'macro_context', 'news', 'geopolitics', 'cross_asset']);

type Params = {
  bias: BiasState;
  evidence: RankedEvidenceItem[];
  events: CanonicalEvent[];
  timeframe: Timeframe;
  directionalSupport: DirectionalSupport;
};

function buildTimeframeConflict(events: CanonicalEvent[], targetTimeframe: Timeframe): number {
  const values = events.map((event) => {
    const related = event.relatedTimeframes;
    let contribution = 75;
    if (related.length === 0) {
      contribution = 20;
    } else if (related.includes(targetTimeframe)) {
      contribution = 0;
    } else if (related.some((timeframe) => ADJACENT_TIMEFRAMES[targetTimeframe].includes(timeframe))) {
      contribution = 35;
    }

    return {
      value: contribution,
      weight: Math.max(event.relevanceScore, 1)
    };
  });

  return weightedAverage(values, 20);
}

export function composeContradictionAnatomy(params: Params): ContradictionAnatomy {
  const { bias, evidence, events, directionalSupport, timeframe } = params;

  const narrativeConflict = directionalSupport.totalWeight <= 0
    ? 20
    : roundScore(clampTo100(((directionalSupport.mixedWeight + 0.5 * directionalSupport.neutralWeight) / directionalSupport.totalWeight) * 100));

  let eventConflict = 20;
  if (bias === 'neutral') {
    if (directionalSupport.comparableDirectionalWeight <= 0) {
      eventConflict = 20;
    } else {
      const dominant = Math.max(directionalSupport.bullishWeight, directionalSupport.bearishWeight);
      const subordinate = Math.min(directionalSupport.bullishWeight, directionalSupport.bearishWeight);
      eventConflict = dominant <= 0 ? 20 : roundScore(clampTo100((subordinate / dominant) * 100));
    }
  } else if (directionalSupport.comparableDirectionalWeight <= 0) {
    eventConflict = 25;
  } else {
    const opposingWeight = bias === 'bullish' ? directionalSupport.bearishWeight : directionalSupport.bullishWeight;
    eventConflict = roundScore(clampTo100((opposingWeight / directionalSupport.comparableDirectionalWeight) * 100));
  }

  let priceConflict = 0;
  if (bias === 'neutral') {
    const allAvg = weightedAverage(
      evidence.map((item) => ({ value: item.priceProximityScore, weight: item.finalRankScore })),
      50
    );
    priceConflict = roundScore(clampTo100(100 - allAvg));
  } else {
    const alignedEvidence = evidence.filter((item) => item.directionHint === bias);
    const opposingEvidence = evidence.filter((item) =>
      bias === 'bullish' ? item.directionHint === 'bearish' : item.directionHint === 'bullish'
    );
    const opposingWeight = opposingEvidence.reduce((sum, item) => sum + item.finalRankScore, 0);
    const alignedAvgProximity = weightedAverage(alignedEvidence.map((item) => ({ value: item.priceProximityScore, weight: item.finalRankScore })), 50);
    const opposingAvgProximity = weightedAverage(opposingEvidence.map((item) => ({ value: item.priceProximityScore, weight: item.finalRankScore })), 0);
    const oppositionRatio = directionalSupport.comparableDirectionalWeight <= 0
      ? 0
      : roundScore(clampTo100((opposingWeight / directionalSupport.comparableDirectionalWeight) * 100));

    priceConflict = roundScore(clampTo100(((opposingAvgProximity * oppositionRatio) / 100) + Math.max(0, 50 - alignedAvgProximity)));
  }

  const macroBullishWeight = evidence
    .filter((item) => MACRO_KINDS.has(item.kind) && item.directionHint === 'bullish')
    .reduce((sum, item) => sum + item.finalRankScore, 0);
  const macroBearishWeight = evidence
    .filter((item) => MACRO_KINDS.has(item.kind) && item.directionHint === 'bearish')
    .reduce((sum, item) => sum + item.finalRankScore, 0);
  const macroMixedWeight = evidence
    .filter((item) => MACRO_KINDS.has(item.kind) && item.directionHint === 'mixed')
    .reduce((sum, item) => sum + item.finalRankScore, 0);
  const macroTotal = macroBullishWeight + macroBearishWeight + macroMixedWeight;

  const macroConflict = macroTotal <= 0
    ? 15
    : roundScore(clampTo100(((Math.min(macroBullishWeight, macroBearishWeight) + macroMixedWeight) / macroTotal) * 100));

  const timeframeConflict = buildTimeframeConflict(events, timeframe);

  const weightedScore = computeContradictionWeightedScore({
    narrativeConflict,
    priceConflict,
    eventConflict,
    macroConflict,
    timeframeConflict
  });
  const regime = mapContradictionRegime(weightedScore);

  return {
    narrativeConflict,
    priceConflict,
    eventConflict,
    macroConflict,
    timeframeConflict,
    weightedScore,
    regime,
    componentsVersion: REASONING_COMPONENTS_VERSION
  };
}
