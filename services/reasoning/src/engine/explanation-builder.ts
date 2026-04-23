import type { BiasState, ContradictionRegime, InvalidationState, RankedEvidenceItem, ZoneSignificance } from '@elceo/types';
import type { ZoneConfluenceSummary } from './zone-anchoring';
import { sortEvidenceByRank } from './utils';

function topLabels(evidence: RankedEvidenceItem[], count: number): string[] {
  return sortEvidenceByRank(evidence)
    .slice(0, count)
    .map((item) => item.label);
}

function topExplanations(evidence: RankedEvidenceItem[], count: number): string[] {
  return sortEvidenceByRank(evidence)
    .slice(0, count)
    .map((item) => item.explanation);
}

function explanationsFromOrdered(evidence: RankedEvidenceItem[], count: number): string[] {
  return evidence.slice(0, count).map((item) => item.explanation);
}

function freshnessBucket(score: number): 'fresh' | 'aging' | 'stale' {
  if (score >= 75) return 'fresh';
  if (score >= 40) return 'aging';
  return 'stale';
}

function nextRegime(regime: ContradictionRegime): ContradictionRegime {
  if (regime === 'none') return 'low';
  if (regime === 'low') return 'moderate';
  if (regime === 'moderate') return 'high';
  if (regime === 'high') return 'critical';
  return 'critical';
}

function anchoredFirst(evidence: RankedEvidenceItem[]): RankedEvidenceItem[] {
  return [...evidence].sort((a, b) => {
    const aAnchored = a.linkedZoneIds.length > 0 ? 1 : 0;
    const bAnchored = b.linkedZoneIds.length > 0 ? 1 : 0;
    if (bAnchored !== aAnchored) return bAnchored - aAnchored;
    if (b.finalRankScore !== a.finalRankScore) return b.finalRankScore - a.finalRankScore;
    if (b.impactScore !== a.impactScore) return b.impactScore - a.impactScore;
    return a.evidenceId.localeCompare(b.evidenceId);
  });
}

export function buildThesis(bias: BiasState, primaryInvalidationPrice: number): string {
  if (bias === 'bullish') {
    return `Bias favors upside while ranked evidence remains supportive and invalidation stays above ${primaryInvalidationPrice}.`;
  }
  if (bias === 'bearish') {
    return `Bias favors downside while ranked evidence remains supportive and invalidation stays below ${primaryInvalidationPrice}.`;
  }
  return `Bias remains neutral while supportive and contradictory evidence stay unresolved around ${primaryInvalidationPrice}.`;
}

export function buildNarrativeSummary(params: {
  biasLabel: string;
  evidence: RankedEvidenceItem[];
  contradictionRegime: ContradictionRegime;
  freshnessScore: number;
}): string {
  const labels = topLabels(params.evidence, 2);
  if (labels.length === 0) return 'No material ranked evidence available.';
  const drivers = labels.length >= 2 ? `${labels[0]} and ${labels[1]}` : labels[0];
  return `${params.biasLabel}. Top drivers: ${drivers}. Contradiction is ${params.contradictionRegime} and evidence freshness is ${freshnessBucket(params.freshnessScore)}.`;
}

export function buildExplanation(params: {
  bias: BiasState;
  biasLabel: string;
  confidenceScore: number;
  contradictionScore: number;
  contradictionRegime: ContradictionRegime;
  freshnessScore: number;
  evidence: RankedEvidenceItem[];
  enrichedEvidence?: RankedEvidenceItem[];
  invalidation: InvalidationState;
  zones: ZoneSignificance[];
  recentPriceRange: { high: number; low: number; close: number };
  zoneConfluenceSummary?: ZoneConfluenceSummary;
}): {
  concise: string;
  expanded: string;
  bulletReasons: string[];
  supportingReasons: string[];
  contradictoryReasons: string[];
  whatWouldChangeState: string[];
} {
  const evidenceInput = params.enrichedEvidence ?? params.evidence;
  const rankedEvidence = sortEvidenceByRank(evidenceInput);
  const primaryInvalidationPrice = params.invalidation.primary?.price ?? params.recentPriceRange.close;
  const topTwoLabels = topLabels(rankedEvidence, 2);
  const topTwoSummary = topTwoLabels.length > 0 ? topTwoLabels.join(' and ') : 'limited ranked evidence';

  const bulletReasons = topLabels(rankedEvidence, 3);

  const supportingPool = params.bias === 'neutral'
    ? rankedEvidence
    : rankedEvidence.filter((item) => item.directionHint === params.bias);
  const supportingReasons = params.bias === 'neutral'
    ? topExplanations(supportingPool, 5)
    : explanationsFromOrdered(anchoredFirst(supportingPool), 5);

  let contradictoryPool: RankedEvidenceItem[] = [];
  if (params.bias === 'bullish') {
    contradictoryPool = rankedEvidence.filter((item) => item.directionHint === 'bearish' || item.directionHint === 'mixed');
  } else if (params.bias === 'bearish') {
    contradictoryPool = rankedEvidence.filter((item) => item.directionHint === 'bullish' || item.directionHint === 'mixed');
  } else {
    contradictoryPool = rankedEvidence.filter((item) => item.directionHint === 'mixed');
    const hasBullish = rankedEvidence.some((item) => item.directionHint === 'bullish');
    const hasBearish = rankedEvidence.some((item) => item.directionHint === 'bearish');
    if (contradictoryPool.length === 0 && hasBullish && hasBearish) {
      contradictoryPool = rankedEvidence.filter((item) => item.directionHint === 'bullish' || item.directionHint === 'bearish');
    }
  }

  const contradictoryReasons = explanationsFromOrdered(anchoredFirst(contradictoryPool), 3);

  const whatWouldChangeState = [
    `Primary invalidation triggers at ${primaryInvalidationPrice}.`,
    `A contradiction score moving deeper into ${nextRegime(params.contradictionRegime)} would weaken the current state.`,
    'Further freshness decay without reinforcing evidence would reduce confidence.'
  ];

  if (params.zones.length > 0) {
    whatWouldChangeState.push('Loss of reaction quality around primary zones would weaken the current thesis.');
  }

  if (params.zoneConfluenceSummary?.strongestAnchoredZoneId) {
    whatWouldChangeState.push(`Failure to hold confluence around ${params.zoneConfluenceSummary.strongestAnchoredZoneId} would weaken the current thesis.`);
  }

  const strongestConfluenceSentence = params.zoneConfluenceSummary?.strongestAnchoredZoneId
    ? ` The strongest current zone confluence is ${params.zoneConfluenceSummary.strongestAnchoredZoneId}.`
    : '';

  return {
    concise: `${params.biasLabel} with ${params.confidenceScore} confidence, ${params.contradictionRegime} contradiction, and ${evidenceInput.length} ranked evidence items.`,
    expanded: `${params.biasLabel} state is supported by ${topTwoSummary}. Confidence is ${params.confidenceScore}, contradiction is ${params.contradictionScore} (${params.contradictionRegime}), freshness is ${params.freshnessScore}, and the primary invalidation level sits at ${primaryInvalidationPrice}.${strongestConfluenceSentence}`,
    bulletReasons: bulletReasons.length > 0 ? bulletReasons : ['No ranked evidence available.'],
    supportingReasons: supportingReasons.length > 0 ? supportingReasons : ['Support is limited; state relies on weak or balanced evidence.'],
    contradictoryReasons: contradictoryReasons.length > 0 ? contradictoryReasons : ['No material contradictory evidence is currently ranked near the top.'],
    whatWouldChangeState
  };
}
