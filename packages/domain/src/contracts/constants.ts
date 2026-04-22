import type { Timeframe } from '@elceo/types';

export const CONFIDENCE_WEIGHTS = {
  sourceIntegrity: 0.3,
  eventAlignment: 0.25,
  priceAcceptance: 0.3,
  contradictionPenalty: 0.1,
  stalenessPenalty: 0.05
} as const;

export const CONTRADICTION_WEIGHTS = {
  narrativeConflict: 0.25,
  priceConflict: 0.3,
  eventConflict: 0.2,
  macroConflict: 0.15,
  timeframeConflict: 0.1
} as const;

export const ZONE_SIGNIFICANCE_WEIGHTS = {
  touchCountScore: 0.2,
  reactionMagnitudeScore: 0.3,
  recencyScore: 0.2,
  wickBodyRespectScore: 0.15,
  multiTimeframeConfluenceScore: 0.15
} as const;

export const TIMEFRAME_DECAY_RATE: Record<Timeframe, number> = {
  M5: 12,
  M15: 8,
  H1: 4,
  H4: 2,
  D1: 0.75
};

export const TIMEFRAME_STALE_THRESHOLD_HOURS: Record<Timeframe, number> = {
  M5: 6,
  M15: 12,
  H1: 24,
  H4: 72,
  D1: 168
};
