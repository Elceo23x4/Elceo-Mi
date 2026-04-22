import type { ConfidenceAnatomy, ContradictionAnatomy, ContradictionRegime, FreshnessState, InvalidationState, Timeframe } from '@elceo/types';
import { CONFIDENCE_WEIGHTS, CONTRADICTION_WEIGHTS, TIMEFRAME_DECAY_RATE, TIMEFRAME_STALE_THRESHOLD_HOURS, ZONE_SIGNIFICANCE_WEIGHTS } from './constants';

export function clampTo100(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeConfidenceWeightedScore(input: Omit<ConfidenceAnatomy, 'weightedScore' | 'componentsVersion'>): number {
  const score =
    CONFIDENCE_WEIGHTS.sourceIntegrity * input.sourceIntegrity +
    CONFIDENCE_WEIGHTS.eventAlignment * input.eventAlignment +
    CONFIDENCE_WEIGHTS.priceAcceptance * input.priceAcceptance -
    CONFIDENCE_WEIGHTS.contradictionPenalty * input.contradictionPenalty -
    CONFIDENCE_WEIGHTS.stalenessPenalty * input.stalenessPenalty;
  return roundScore(clampTo100(score));
}

export function computeContradictionWeightedScore(input: Omit<ContradictionAnatomy, 'weightedScore' | 'regime' | 'componentsVersion'>): number {
  const score =
    CONTRADICTION_WEIGHTS.narrativeConflict * input.narrativeConflict +
    CONTRADICTION_WEIGHTS.priceConflict * input.priceConflict +
    CONTRADICTION_WEIGHTS.eventConflict * input.eventConflict +
    CONTRADICTION_WEIGHTS.macroConflict * input.macroConflict +
    CONTRADICTION_WEIGHTS.timeframeConflict * input.timeframeConflict;
  return roundScore(clampTo100(score));
}

export function mapContradictionRegime(score: number): ContradictionRegime {
  if (score < 15) return 'none';
  if (score < 35) return 'low';
  if (score < 60) return 'moderate';
  if (score < 80) return 'high';
  return 'critical';
}

export function getDecayRateForTimeframe(timeframe: Timeframe): number {
  return TIMEFRAME_DECAY_RATE[timeframe];
}

export function getStaleThresholdForTimeframe(timeframe: Timeframe): number {
  return TIMEFRAME_STALE_THRESHOLD_HOURS[timeframe];
}

export function computeFreshnessState(params: {
  timeframe: Timeframe;
  hoursSinceLastMaterialUpdate: number;
  lastMaterialUpdateAt: string;
  componentsVersion: string;
}): FreshnessState {
  const decayRatePerHour = getDecayRateForTimeframe(params.timeframe);
  const staleThresholdHours = getStaleThresholdForTimeframe(params.timeframe);
  const freshnessScore = roundScore(clampTo100(100 - decayRatePerHour * params.hoursSinceLastMaterialUpdate));
  return {
    freshnessScore,
    hoursSinceLastMaterialUpdate: params.hoursSinceLastMaterialUpdate,
    lastMaterialUpdateAt: params.lastMaterialUpdateAt,
    decayRatePerHour,
    stale: params.hoursSinceLastMaterialUpdate >= staleThresholdHours,
    staleThresholdHours,
    componentsVersion: params.componentsVersion
  };
}

export function computeZoneTouchCountScore(touchCount: number): number {
  return roundScore(clampTo100((Math.min(touchCount, 5) / 5) * 100));
}

export function computeZoneStrengthScore(params: {
  touchCount: number;
  reactionMagnitudeScore: number;
  recencyScore: number;
  wickBodyRespectScore: number;
  multiTimeframeConfluenceScore: number;
}): number {
  const touchCountScore = computeZoneTouchCountScore(params.touchCount);
  const weighted =
    ZONE_SIGNIFICANCE_WEIGHTS.touchCountScore * touchCountScore +
    ZONE_SIGNIFICANCE_WEIGHTS.reactionMagnitudeScore * params.reactionMagnitudeScore +
    ZONE_SIGNIFICANCE_WEIGHTS.recencyScore * params.recencyScore +
    ZONE_SIGNIFICANCE_WEIGHTS.wickBodyRespectScore * params.wickBodyRespectScore +
    ZONE_SIGNIFICANCE_WEIGHTS.multiTimeframeConfluenceScore * params.multiTimeframeConfluenceScore;
  return roundScore(clampTo100(weighted));
}

export function mapInvalidationRiskLabel(primarySeverity: number | null): InvalidationState['riskLabel'] {
  if (primarySeverity === null || primarySeverity < 25) return 'guarded';
  if (primarySeverity < 50) return 'warning';
  if (primarySeverity < 75) return 'fragile';
  return 'broken';
}
