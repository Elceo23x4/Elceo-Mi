import { clampTo100 } from '@elceo/domain';
import type { BiasState, CanonicalAssetSymbol, CanonicalCognitionState, CanonicalEvent, RankedEvidenceItem, Timeframe } from '@elceo/types';

const IMPACT_SCORE_MAP: Record<CanonicalEvent['impact'], number> = {
  low: 25,
  medium: 55,
  high: 80,
  critical: 95
};

const BULLISH_TAGS = new Set(['bullish', 'hawkish', 'risk_on', 'supportive', 'breakout_up', 'upside']);
const BEARISH_TAGS = new Set(['bearish', 'dovish', 'risk_off', 'weakening', 'breakdown_down', 'downside']);
const NEUTRAL_TAGS = new Set(['neutral', 'balanced', 'range']);

function getAssetContext(asset: CanonicalAssetSymbol): { baseCurrency: string; quoteCurrency: string; primaryRegions: string[] } {
  const [base, quote] = asset.toUpperCase().split('/');
  const currencyToRegions: Record<string, string[]> = {
    USD: ['US', 'GLOBAL'],
    EUR: ['EU', 'GLOBAL'],
    GBP: ['UK', 'GLOBAL'],
    JPY: ['JP', 'GLOBAL'],
    CHF: ['CH', 'GLOBAL'],
    AUD: ['AU', 'GLOBAL'],
    NZD: ['NZ', 'GLOBAL'],
    CAD: ['CA', 'GLOBAL'],
    XAU: ['GLOBAL'],
    BTC: ['GLOBAL']
  };
  const baseCurrency = base ?? 'NA';
  const quoteCurrency = quote ?? 'NA';
  return {
    baseCurrency,
    quoteCurrency,
    primaryRegions: [...(currencyToRegions[baseCurrency] ?? []), ...(currencyToRegions[quoteCurrency] ?? [])]
  };
}

export function deriveDirectionHint(tags: string[]): RankedEvidenceItem['directionHint'] {
  const normalized = new Set(tags.map((item) => item.toLowerCase()));
  const hasBullish = [...BULLISH_TAGS].some((tag) => normalized.has(tag));
  const hasBearish = [...BEARISH_TAGS].some((tag) => normalized.has(tag));
  const hasNeutral = [...NEUTRAL_TAGS].some((tag) => normalized.has(tag));

  if (hasBullish && !hasBearish) return 'bullish';
  if (hasBearish && !hasBullish) return 'bearish';
  if (hasNeutral && !hasBullish && !hasBearish) return 'neutral';
  return 'mixed';
}

export function computeConfirmationScore(confirmationCount: number): number {
  return clampTo100((Math.min(confirmationCount, 5) / 5) * 100);
}

function biasesOppose(a: BiasState, b: BiasState): boolean {
  return (a === 'bullish' && b === 'bearish') || (a === 'bearish' && b === 'bullish');
}

export function computePriceProximityScore(event: CanonicalEvent, targetAsset: CanonicalAssetSymbol): number {
  const context = getAssetContext(targetAsset);
  if (
    (event.eventKind === 'market_structure' || event.eventKind === 'price_action' || event.eventKind === 'zone_reaction') &&
    event.relatedAssets.includes(targetAsset)
  ) {
    return 80;
  }
  if (event.relatedAssets.includes(targetAsset)) {
    return 65;
  }
  if (event.currency && (event.currency.toUpperCase() === context.baseCurrency || event.currency.toUpperCase() === context.quoteCurrency)) {
    return 50;
  }
  if (event.region === 'GLOBAL') {
    return 40;
  }
  if (event.region && context.primaryRegions.includes(event.region.toUpperCase())) {
    return 50;
  }
  return 20;
}

export function computeContradictionContributionScore(directionHint: RankedEvidenceItem['directionHint'], priorCognition: CanonicalCognitionState | null): number {
  if (directionHint === 'mixed') return 70;
  if (priorCognition === null) return 25;
  if (priorCognition.bias === 'neutral') return 25;
  if (directionHint === 'neutral') return 20;
  if (biasesOppose(directionHint, priorCognition.bias)) return 85;
  if (directionHint === priorCognition.bias) return 10;
  return 25;
}

export function projectCanonicalEventToEvidenceItem(params: {
  event: CanonicalEvent;
  targetAsset: CanonicalAssetSymbol;
  targetTimeframe: Timeframe;
  latestPrice: number;
  priorCognition: CanonicalCognitionState | null;
}): RankedEvidenceItem {
  const { event, targetAsset, targetTimeframe, priorCognition } = params;
  const impactScore = IMPACT_SCORE_MAP[event.impact];
  const confirmationScore = computeConfirmationScore(event.confirmationCount);
  const directionHint = deriveDirectionHint(event.tags);
  const priceProximityScore = computePriceProximityScore(event, targetAsset);

  const confidenceContributionScore = clampTo100(
    0.35 * event.relevanceScore +
      0.2 * impactScore +
      0.15 * event.sourceReliabilityScore +
      0.15 * event.recencyScore +
      0.15 * confirmationScore
  );

  const contradictionContributionScore = computeContradictionContributionScore(directionHint, priorCognition);

  const finalRankScore = clampTo100(
    0.3 * event.relevanceScore +
      0.2 * impactScore +
      0.15 * event.recencyScore +
      0.15 * event.sourceReliabilityScore +
      0.1 * confirmationScore +
      0.1 * priceProximityScore
  );

  return {
    evidenceId: `evidence|${event.id}`,
    eventId: event.id,
    kind: event.eventKind,
    label: event.title,
    explanation: event.summary,
    asset: targetAsset,
    timeframe: targetTimeframe,
    directionHint,
    impactScore,
    recencyScore: event.recencyScore,
    sourceReliabilityScore: event.sourceReliabilityScore,
    priceProximityScore,
    confirmationScore,
    contradictionContributionScore,
    confidenceContributionScore,
    finalRankScore,
    linkedZoneIds: [],
    linkedPriceLevels: [],
    linkedCandleTimes: [],
    linkedNotes: [event.normalizedNarrative],
    stale: event.stale,
    occurredAt: event.occurredAt,
    tags: [...event.tags]
  };
}

export function buildRankedEvidenceCandidates(
  events: CanonicalEvent[],
  targetAsset: CanonicalAssetSymbol,
  targetTimeframe: Timeframe,
  latestPrice: number,
  priorCognition: CanonicalCognitionState | null
): RankedEvidenceItem[] {
  return events
    .map((event) =>
      projectCanonicalEventToEvidenceItem({
        event,
        targetAsset,
        targetTimeframe,
        latestPrice,
        priorCognition
      })
    )
    .sort(
      (left, right) =>
        right.finalRankScore - left.finalRankScore ||
        right.impactScore - left.impactScore ||
        right.recencyScore - left.recencyScore ||
        right.sourceReliabilityScore - left.sourceReliabilityScore ||
        left.evidenceId.localeCompare(right.evidenceId)
    );
}
