import { clampTo100, roundScore } from '@elceo/domain';
import type { CanonicalAssetSymbol, CanonicalEvent, EvidenceKind, Timeframe } from '@elceo/types';
import { getAssetContext, type AssetClass } from './asset-context';
import { getEffectiveSourceReliabilityScore } from './source-reliability';

const IMPACT_SCORE: Record<CanonicalEvent['impact'], number> = {
  low: 2,
  medium: 5,
  high: 8,
  critical: 10
};

const EVIDENCE_ALIGNMENT_SCORE: Record<AssetClass, Record<EvidenceKind, number>> = {
  fx: {
    macro_calendar: 15, macro_context: 14, news: 10, geopolitics: 10, cross_asset: 9, market_structure: 12, price_action: 12, zone_reaction: 12, sentiment: 8, volume: 7, volatility: 9, journal_behavior: 2, system: 1
  },
  index: {
    macro_calendar: 13, macro_context: 14, news: 12, geopolitics: 12, cross_asset: 10, market_structure: 12, price_action: 12, zone_reaction: 12, sentiment: 9, volume: 8, volatility: 10, journal_behavior: 2, system: 1
  },
  commodity: {
    macro_calendar: 12, macro_context: 13, news: 11, geopolitics: 15, cross_asset: 10, market_structure: 12, price_action: 12, zone_reaction: 12, sentiment: 8, volume: 8, volatility: 9, journal_behavior: 2, system: 1
  },
  crypto: {
    macro_calendar: 9, macro_context: 10, news: 13, geopolitics: 8, cross_asset: 10, market_structure: 13, price_action: 13, zone_reaction: 13, sentiment: 11, volume: 9, volatility: 11, journal_behavior: 2, system: 1
  },
  other: {
    macro_calendar: 10, macro_context: 10, news: 10, geopolitics: 10, cross_asset: 10, market_structure: 10, price_action: 10, zone_reaction: 10, sentiment: 5, volume: 5, volatility: 5, journal_behavior: 2, system: 1
  }
};

const TIMEFRAME_ADJACENCY: Record<Timeframe, Timeframe[]> = {
  M5: ['M15'],
  M15: ['M5', 'H1'],
  H1: ['M15', 'H4'],
  H4: ['H1', 'D1'],
  D1: ['H4']
};

function getAssetLinkageScore(event: CanonicalEvent, targetAsset: CanonicalAssetSymbol): number {
  const targetContext = getAssetContext(targetAsset);
  if (event.relatedAssets.includes(targetAsset)) return 35;

  const currency = event.currency?.toUpperCase() ?? null;
  if (currency && (currency === targetContext.baseCurrency || currency === targetContext.quoteCurrency)) return 20;

  const region = event.region?.toUpperCase() ?? null;
  if (region && targetContext.primaryRegions.includes(region)) return 12;
  if (region === 'GLOBAL') return 8;
  return 0;
}

function getTimeframeAlignmentScore(event: CanonicalEvent, targetTimeframe: Timeframe): number {
  if (event.relatedTimeframes.length === 0) return 5;
  if (event.relatedTimeframes.includes(targetTimeframe)) return 10;

  const adjacent = TIMEFRAME_ADJACENCY[targetTimeframe];
  if (event.relatedTimeframes.some((tf) => adjacent.includes(tf))) return 6;
  return 2;
}

export function computeEventRelevanceScore(event: CanonicalEvent, targetAsset: CanonicalAssetSymbol, targetTimeframe: Timeframe, _asOf: string): number {
  const assetContext = getAssetContext(targetAsset);
  const assetLinkageScore = getAssetLinkageScore(event, targetAsset);
  const evidenceKindAlignmentScore = EVIDENCE_ALIGNMENT_SCORE[assetContext.assetClass][event.eventKind];
  const impactScoreContribution = IMPACT_SCORE[event.impact];
  const timeframeAlignmentContribution = getTimeframeAlignmentScore(event, targetTimeframe);
  const recencyContribution = roundScore(event.recencyScore * 0.15);
  const reliabilityContribution = roundScore(getEffectiveSourceReliabilityScore(event) * 0.15);

  return clampTo100(roundScore(
    assetLinkageScore +
      evidenceKindAlignmentScore +
      impactScoreContribution +
      timeframeAlignmentContribution +
      recencyContribution +
      reliabilityContribution
  ));
}
