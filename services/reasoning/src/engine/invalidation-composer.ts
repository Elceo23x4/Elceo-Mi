import { clampTo100, mapInvalidationRiskLabel, roundScore } from '@elceo/domain';
import type { BiasState, InvalidationLevel, InvalidationState, RankedEvidenceItem, Timeframe, ZoneSignificance } from '@elceo/types';
import type { CanonicalAssetSymbol } from '@elceo/types';
import { precisionFromRange, roundToPrecision, sortEvidenceByRank, uniqueStrings } from './utils';

function buildLinkedZoneIds(evidence: RankedEvidenceItem[], zones: ZoneSignificance[]): string[] {
  const fromEvidence = evidence.flatMap((item) => item.linkedZoneIds);
  const fromZones = zones.map((zone) => zone.zoneId);
  return uniqueStrings([...fromEvidence, ...fromZones]).slice(0, 5);
}

function buildLinkedEvidenceIds(evidence: RankedEvidenceItem[]): string[] {
  return sortEvidenceByRank(evidence).slice(0, 3).map((item) => item.evidenceId);
}

function buildLevelId(kind: 'primary' | 'secondary', asset: CanonicalAssetSymbol, timeframe: Timeframe, index?: number): string {
  if (kind === 'primary') return `invalidation|primary|${asset}|${timeframe}`;
  return `invalidation|secondary|${asset}|${timeframe}|${index ?? 0}`;
}

export function composeInvalidationState(params: {
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  bias: BiasState;
  confidenceScore: number;
  contradictionScore: number;
  freshnessScore: number;
  recentPriceRange: { high: number; low: number; close: number };
  evidence: RankedEvidenceItem[];
  zones: ZoneSignificance[];
}): InvalidationState {
  const { asset, timeframe, bias, confidenceScore, contradictionScore, freshnessScore, recentPriceRange, evidence, zones } = params;
  const precision = precisionFromRange(recentPriceRange);

  const primarySeverityScore = roundScore(clampTo100(
    0.5 * contradictionScore +
    0.25 * (100 - confidenceScore) +
    0.25 * (100 - freshnessScore)
  ));

  const linkedEvidenceIds = buildLinkedEvidenceIds(evidence);
  const linkedZoneIds = buildLinkedZoneIds(sortEvidenceByRank(evidence), zones);

  const buildBaseLevel = (overrides: {
    side: InvalidationLevel['side'];
    price: number;
    reason: string;
    severityScore: number;
    triggeredBy: string[];
    kind: 'primary' | 'secondary';
    index?: number;
  }): InvalidationLevel => ({
    invalidationId: buildLevelId(overrides.kind, asset, timeframe, overrides.index),
    asset,
    timeframe,
    price: roundToPrecision(overrides.price, precision),
    side: overrides.side,
    severityScore: roundScore(clampTo100(overrides.severityScore)),
    reason: overrides.reason,
    linkedEvidenceIds,
    linkedZoneIds,
    triggeredBy: overrides.triggeredBy,
    confirmed: false,
    confirmedAt: null
  });

  let primary: InvalidationLevel;
  let secondary: InvalidationLevel[];

  if (bias === 'bullish') {
    primary = buildBaseLevel({
      kind: 'primary',
      side: 'bullish_invalidation',
      price: recentPriceRange.low,
      severityScore: primarySeverityScore,
      reason: 'Bullish state fails if price accepts below recent range low.',
      triggeredBy: ['recent_range_low', 'contradiction_and_confidence_decay']
    });
    secondary = [
      buildBaseLevel({
        kind: 'secondary',
        index: 0,
        side: 'bullish_invalidation',
        price: (recentPriceRange.low + recentPriceRange.close) / 2,
        severityScore: Math.max(primarySeverityScore - 20, 0),
        reason: 'Bullish structure weakens through the lower half of the recent range.',
        triggeredBy: ['range_halfway_decay']
      })
    ];
  } else if (bias === 'bearish') {
    primary = buildBaseLevel({
      kind: 'primary',
      side: 'bearish_invalidation',
      price: recentPriceRange.high,
      severityScore: primarySeverityScore,
      reason: 'Bearish state fails if price accepts above recent range high.',
      triggeredBy: ['recent_range_high', 'contradiction_and_confidence_decay']
    });
    secondary = [
      buildBaseLevel({
        kind: 'secondary',
        index: 0,
        side: 'bearish_invalidation',
        price: (recentPriceRange.high + recentPriceRange.close) / 2,
        severityScore: Math.max(primarySeverityScore - 20, 0),
        reason: 'Bearish structure weakens through the upper half of the recent range.',
        triggeredBy: ['range_halfway_decay']
      })
    ];
  } else {
    primary = buildBaseLevel({
      kind: 'primary',
      side: 'neutral_break',
      price: recentPriceRange.close,
      severityScore: primarySeverityScore,
      reason: 'Neutral balance breaks when price resolves away from the recent midpoint.',
      triggeredBy: ['recent_range_midpoint_break', 'balanced_state_resolution']
    });
    secondary = [
      buildBaseLevel({
        kind: 'secondary',
        index: 0,
        side: 'bearish_invalidation',
        price: recentPriceRange.low,
        severityScore: Math.max(primarySeverityScore - 15, 0),
        reason: 'Neutral balance leans bearish if price accepts below the recent low.',
        triggeredBy: ['recent_range_low']
      }),
      buildBaseLevel({
        kind: 'secondary',
        index: 1,
        side: 'bullish_invalidation',
        price: recentPriceRange.high,
        severityScore: Math.max(primarySeverityScore - 15, 0),
        reason: 'Neutral balance leans bullish if price accepts above the recent high.',
        triggeredBy: ['recent_range_high']
      })
    ];
  }

  return {
    primary,
    secondary,
    summary: `Primary invalidation for ${bias} context is ${primary.price}.`,
    riskLabel: mapInvalidationRiskLabel(primarySeverityScore)
  };
}
