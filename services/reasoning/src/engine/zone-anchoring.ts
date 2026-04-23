import { clampTo100, roundScore } from '@elceo/domain';
import type { RankedEvidenceItem, Timeframe, ZoneSide, ZoneSignificance } from '@elceo/types';

export type EvidenceZoneAnchor = {
  zoneId: string;
  linkScore: number;
  midpoint: number;
  side: ZoneSide;
};

export type EvidenceZoneAnchorResult = {
  evidenceId: string;
  linkedZoneIds: string[];
  linkedPriceLevels: number[];
  linkedCandleTimes: string[];
  linkedNotes: string[];
  topLinkScore: number;
  anchors: EvidenceZoneAnchor[];
};

export type ZoneConfluenceSummary = {
  activeAnchoredZoneIds: string[];
  strongestAnchoredZoneId: string | null;
  strongestAnchoredLinkScore: number;
  anchoredEvidenceCount: number;
  bullishAnchoredCount: number;
  bearishAnchoredCount: number;
  neutralOrMixedAnchoredCount: number;
};

function uniqueNumbers(values: number[]): number[] {
  const seen = new Set<string>();
  const output: number[] = [];
  for (const value of values) {
    const key = `${value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(value);
  }
  return output;
}

function uniqueOrdered(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    output.push(value);
  }
  return output;
}

export function sortZonesForAnchoring(zones: ZoneSignificance[]): ZoneSignificance[] {
  return [...zones].sort((a, b) => {
    if (b.finalStrengthScore !== a.finalStrengthScore) return b.finalStrengthScore - a.finalStrengthScore;
    if (b.recencyScore !== a.recencyScore) return b.recencyScore - a.recencyScore;
    if (b.touchCount !== a.touchCount) return b.touchCount - a.touchCount;
    return a.zoneId.localeCompare(b.zoneId);
  });
}

export function selectAnchorCandidateZones(zones: ZoneSignificance[]): ZoneSignificance[] {
  return sortZonesForAnchoring(zones).slice(0, 8);
}

export function getDirectionZoneCompatibility(
  directionHint: RankedEvidenceItem['directionHint'],
  zoneSide: ZoneSide
): number {
  if (directionHint === 'bullish') {
    if (zoneSide === 'demand') return 100;
    if (zoneSide === 'neutral') return 55;
    return 15;
  }

  if (directionHint === 'bearish') {
    if (zoneSide === 'supply') return 100;
    if (zoneSide === 'neutral') return 55;
    return 15;
  }

  if (zoneSide === 'neutral') return 85;
  return 60;
}

export function computeZoneProximityScore(
  zone: ZoneSignificance,
  recentPriceRange: { high: number; low: number; close: number }
): number {
  const rangeSpan = Math.max(Math.abs(recentPriceRange.high - recentPriceRange.low), 0.0000001);
  const midpointDistance = Math.abs(zone.midpoint - recentPriceRange.close);
  const distanceRatio = midpointDistance / rangeSpan;
  const baseScore = clampTo100(100 - 100 * distanceRatio);
  const insideRange = zone.midpoint >= recentPriceRange.low && zone.midpoint <= recentPriceRange.high;
  if (!insideRange) {
    return roundScore(baseScore);
  }
  return roundScore(clampTo100(baseScore + 10));
}

export function computeEvidenceZoneLinkScore(params: {
  evidence: RankedEvidenceItem;
  zone: ZoneSignificance;
  recentPriceRange: { high: number; low: number; close: number };
  targetTimeframe: Timeframe;
}): number {
  const zoneStrength = params.zone.finalStrengthScore;
  const compatibility = getDirectionZoneCompatibility(params.evidence.directionHint, params.zone.side);
  const proximity = computeZoneProximityScore(params.zone, params.recentPriceRange);

  let linkScore = clampTo100(0.45 * zoneStrength + 0.3 * compatibility + 0.25 * proximity);

  if (
    params.evidence.kind === 'zone_reaction' ||
    params.evidence.kind === 'price_action' ||
    params.evidence.kind === 'market_structure'
  ) {
    linkScore = clampTo100(linkScore + 10);
  }

  if (params.zone.timeframe === params.targetTimeframe) {
    linkScore = clampTo100(linkScore + 5);
  }

  return roundScore(linkScore);
}

export function anchorEvidenceToZones(params: {
  evidence: RankedEvidenceItem;
  candidateZones: ZoneSignificance[];
  recentPriceRange: { high: number; low: number; close: number };
  targetTimeframe: Timeframe;
}): EvidenceZoneAnchorResult {
  const scored = params.candidateZones
    .map((zone) => ({
      zone,
      linkScore: computeEvidenceZoneLinkScore({
        evidence: params.evidence,
        zone,
        recentPriceRange: params.recentPriceRange,
        targetTimeframe: params.targetTimeframe
      })
    }))
    .filter((item) => item.linkScore >= 55)
    .sort((a, b) => {
      if (b.linkScore !== a.linkScore) return b.linkScore - a.linkScore;
      if (b.zone.finalStrengthScore !== a.zone.finalStrengthScore) return b.zone.finalStrengthScore - a.zone.finalStrengthScore;
      return a.zone.zoneId.localeCompare(b.zone.zoneId);
    })
    .slice(0, 3);

  if (scored.length === 0) {
    return {
      evidenceId: params.evidence.evidenceId,
      linkedZoneIds: [],
      linkedPriceLevels: [],
      linkedCandleTimes: [params.evidence.occurredAt],
      linkedNotes: [params.evidence.explanation],
      topLinkScore: 0,
      anchors: []
    };
  }

  const anchors: EvidenceZoneAnchor[] = scored.map((item) => ({
    zoneId: item.zone.zoneId,
    linkScore: item.linkScore,
    midpoint: item.zone.midpoint,
    side: item.zone.side
  }));

  const linkedZoneIds = anchors.map((anchor) => anchor.zoneId);
  const linkedPriceLevels = uniqueNumbers(anchors.map((anchor) => anchor.midpoint)).slice(0, 3);

  const candleTimes = [params.evidence.occurredAt, ...scored.map((item) => item.zone.lastInteractionAt).filter((value): value is string => value !== null)];
  const linkedCandleTimes = uniqueOrdered(candleTimes).slice(0, 4);

  const linkedNotes = uniqueOrdered([
    params.evidence.explanation,
    ...anchors.map((anchor) => `Anchored to ${anchor.side} zone near ${anchor.midpoint} with link score ${Math.round(anchor.linkScore)}.`)
  ]).slice(0, 4);

  return {
    evidenceId: params.evidence.evidenceId,
    linkedZoneIds,
    linkedPriceLevels,
    linkedCandleTimes,
    linkedNotes,
    topLinkScore: anchors[0]?.linkScore ?? 0,
    anchors
  };
}

export function enrichEvidenceWithZoneAnchors(params: {
  evidence: RankedEvidenceItem[];
  zones: ZoneSignificance[];
  recentPriceRange: { high: number; low: number; close: number };
  targetTimeframe: Timeframe;
}): RankedEvidenceItem[] {
  const candidateZones = selectAnchorCandidateZones(params.zones);

  return params.evidence.map((item) => {
    const anchor = anchorEvidenceToZones({
      evidence: item,
      candidateZones,
      recentPriceRange: params.recentPriceRange,
      targetTimeframe: params.targetTimeframe
    });

    return {
      ...item,
      linkedZoneIds: anchor.linkedZoneIds,
      linkedPriceLevels: anchor.linkedPriceLevels,
      linkedCandleTimes: anchor.linkedCandleTimes,
      linkedNotes: anchor.linkedNotes
    };
  });
}

export function buildZoneConfluenceSummary(
  enrichedEvidence: RankedEvidenceItem[],
  zones: ZoneSignificance[]
): ZoneConfluenceSummary {
  const knownZoneIds = new Set(zones.map((zone) => zone.zoneId));

  const activeAnchoredZoneIds: string[] = [];
  const seen = new Set<string>();

  let strongestAnchoredZoneId: string | null = null;
  let strongestAnchoredLinkScore = 0;
  let anchoredEvidenceCount = 0;
  let bullishAnchoredCount = 0;
  let bearishAnchoredCount = 0;
  let neutralOrMixedAnchoredCount = 0;

  for (const item of enrichedEvidence) {
    const linkedIds = item.linkedZoneIds.filter((zoneId) => knownZoneIds.has(zoneId));
    if (linkedIds.length === 0) continue;

    anchoredEvidenceCount += 1;
    if (item.directionHint === 'bullish') bullishAnchoredCount += 1;
    else if (item.directionHint === 'bearish') bearishAnchoredCount += 1;
    else neutralOrMixedAnchoredCount += 1;

    const topZoneId = linkedIds[0] ?? null;
    const topAnchoredNote = item.linkedNotes.find((note) => note.startsWith('Anchored to '));
    const parsedLinkScore = topAnchoredNote === undefined
      ? 0
      : Number(topAnchoredNote.match(/link score (\d+(?:\.\d+)?)\.$/)?.[1] ?? '0');
    const topLinkScore = Number.isFinite(parsedLinkScore) ? parsedLinkScore : 0;

    if (
      topLinkScore > strongestAnchoredLinkScore ||
      (topLinkScore === strongestAnchoredLinkScore && topZoneId !== null && (strongestAnchoredZoneId === null || topZoneId.localeCompare(strongestAnchoredZoneId) < 0))
    ) {
      strongestAnchoredLinkScore = topLinkScore;
      strongestAnchoredZoneId = topZoneId;
    }

    for (const zoneId of linkedIds) {
      if (seen.has(zoneId)) continue;
      seen.add(zoneId);
      activeAnchoredZoneIds.push(zoneId);
    }
  }

  return {
    activeAnchoredZoneIds,
    strongestAnchoredZoneId,
    strongestAnchoredLinkScore,
    anchoredEvidenceCount,
    bullishAnchoredCount,
    bearishAnchoredCount,
    neutralOrMixedAnchoredCount
  };
}
