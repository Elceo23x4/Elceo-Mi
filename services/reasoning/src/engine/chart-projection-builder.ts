import type { InvalidationState, RankedEvidenceItem } from '@elceo/types';
import { sortEvidenceByRank, uniqueStrings } from './utils';

export function buildChartProjection(params: {
  evidence: RankedEvidenceItem[];
  invalidation: InvalidationState;
  contradictionScore: number;
}): {
  annotationIds: string[];
  markerLabels: string[];
  emphasisPriceLevels: number[];
  contradictionMarkerVisible: boolean;
} {
  const topEvidence = sortEvidenceByRank(params.evidence).slice(0, 5);

  const emphasisPriceLevels = uniqueStrings([
    `${params.invalidation.primary?.price ?? ''}`,
    ...params.invalidation.secondary.map((level) => `${level.price}`)
  ])
    .filter((value) => value.length > 0)
    .map((value) => Number(value));

  return {
    annotationIds: topEvidence.map((item) => item.evidenceId),
    markerLabels: topEvidence.map((item) => item.label),
    emphasisPriceLevels,
    contradictionMarkerVisible: params.contradictionScore >= 35
  };
}
