import type { CanonicalAssetSymbol, Timeframe } from './events';

export type ZoneSide = 'demand' | 'supply' | 'neutral';

export type ZoneSignificance = {
  zoneId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  side: ZoneSide;
  lowerBound: number;
  upperBound: number;
  midpoint: number;
  touchCount: number;
  reactionMagnitudeScore: number;
  recencyScore: number;
  wickBodyRespectScore: number;
  multiTimeframeConfluenceScore: number;
  finalStrengthScore: number;
  lastInteractionAt: string | null;
  derivedFromCandleCount: number;
  notes: string[];
  componentsVersion: string;
};

export type InvalidationSide = 'bullish_invalidation' | 'bearish_invalidation' | 'neutral_break';

export type InvalidationLevel = {
  invalidationId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  price: number;
  side: InvalidationSide;
  severityScore: number;
  reason: string;
  linkedEvidenceIds: string[];
  linkedZoneIds: string[];
  triggeredBy: string[];
  confirmed: boolean;
  confirmedAt: string | null;
};

export type InvalidationRiskLabel = 'guarded' | 'warning' | 'fragile' | 'broken';

export type InvalidationState = {
  primary: InvalidationLevel | null;
  secondary: InvalidationLevel[];
  summary: string;
  riskLabel: InvalidationRiskLabel;
};
