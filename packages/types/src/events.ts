/**
 * Canonical event and evidence contracts.
 * Canonical-first rule: new code must depend on CanonicalEvent and RankedEvidenceItem.
 */
export type CanonicalAssetSymbol = string;
export type AssetSymbol = CanonicalAssetSymbol;

export const LAUNCH_ASSET_SYMBOLS = [
  'XAU/USD',
  'BTC/USD',
  'Nasdaq 100',
  'S&P 500',
  'EUR/USD',
  'GBP/USD',
  'USD/JPY',
  'USD/CHF',
  'AUD/USD',
  'NZD/USD',
  'USD/CAD',
  'DE30'
] as const;

export type Timeframe = 'M5' | 'M15' | 'H1' | 'H4' | 'D1';
export type BiasState = 'bullish' | 'bearish' | 'neutral';
export type ContradictionRegime = 'none' | 'low' | 'moderate' | 'high' | 'critical';
export type EvidenceKind =
  | 'market_structure'
  | 'price_action'
  | 'macro_calendar'
  | 'macro_context'
  | 'news'
  | 'geopolitics'
  | 'sentiment'
  | 'volume'
  | 'volatility'
  | 'zone_reaction'
  | 'cross_asset'
  | 'journal_behavior'
  | 'system';

export type EventImpactLevel = 'low' | 'medium' | 'high' | 'critical';
export type EventStatus = 'scheduled' | 'live' | 'published' | 'revised' | 'stale' | 'cancelled' | 'resolved';
export type SourceCategory = 'market_data' | 'macro_calendar' | 'news' | 'geopolitics' | 'macro_context' | 'internal' | 'user';
export type JournalInfluenceFlag = 'none' | 'weak' | 'medium' | 'strong';

export type CanonicalEvent = {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceCategory: SourceCategory;
  eventKind: EvidenceKind;
  status: EventStatus;
  impact: EventImpactLevel;
  title: string;
  summary: string;
  normalizedNarrative: string;
  occurredAt: string;
  detectedAt: string;
  effectiveUntil: string | null;
  region: string | null;
  country: string | null;
  currency: string | null;
  relatedAssets: CanonicalAssetSymbol[];
  relatedTimeframes: Timeframe[];
  relevanceScore: number;
  sourceReliabilityScore: number;
  recencyScore: number;
  confirmationCount: number;
  tags: string[];
  rawPayload: unknown;
  rawUrl: string | null;
  revisionOfEventId: string | null;
  dedupeKey: string;
  stale: boolean;
  freshnessHours: number;
  attribution: {
    provider: string;
    publisher: string | null;
    author: string | null;
  };
  audit: {
    normalizedBy: string;
    normalizationVersion: string;
    ingestedVia: string;
  };
};

export type RankedEvidenceItem = {
  evidenceId: string;
  eventId: string | null;
  kind: EvidenceKind;
  label: string;
  explanation: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  directionHint: BiasState | 'mixed';
  impactScore: number;
  recencyScore: number;
  sourceReliabilityScore: number;
  priceProximityScore: number;
  confirmationScore: number;
  contradictionContributionScore: number;
  confidenceContributionScore: number;
  finalRankScore: number;
  linkedZoneIds: string[];
  linkedPriceLevels: number[];
  linkedCandleTimes: string[];
  linkedNotes: string[];
  stale: boolean;
  occurredAt: string;
  tags: string[];
};
