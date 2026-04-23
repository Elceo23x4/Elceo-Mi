import type { InvalidationState, RankedEvidenceItem, ZoneSignificance } from '@elceo/types';
import { sortEvidenceByRank } from './utils';
import { buildEmphasisPriceLevels } from './price-level-projection';

export function buildChartProjection(params: {
  contradictionScore: number;
  enrichedEvidence: RankedEvidenceItem[];
  invalidation: InvalidationState;
  zonesSection: { primary: ZoneSignificance[]; secondary: ZoneSignificance[]; activeZoneIds: string[] };
  recentPriceRange: { high: number; low: number; close: number };
}): {
  annotationIds: string[];
  markerLabels: string[];
  emphasisPriceLevels: number[];
  contradictionMarkerVisible: boolean;
} {
  const topEvidence = sortEvidenceByRank(params.enrichedEvidence).slice(0, 8);

  const annotationIds = topEvidence
    .map((item) => {
      const firstZoneId = item.linkedZoneIds[0];
      if (firstZoneId) return `annotation|${item.evidenceId}|zone|${firstZoneId}`;
      return `annotation|${item.evidenceId}|standalone`;
    })
    .slice(0, 8);

  const markerLabels = topEvidence
    .map((item) => {
      if (item.linkedZoneIds.length > 0) return `${item.label} · anchored`;
      return `${item.label} · standalone`;
    })
    .slice(0, 8);

  return {
    annotationIds,
    markerLabels,
    emphasisPriceLevels: buildEmphasisPriceLevels({
      invalidation: params.invalidation,
      enrichedEvidence: params.enrichedEvidence,
      zones: {
        primary: params.zonesSection.primary,
        secondary: params.zonesSection.secondary
      },
      recentPriceRange: params.recentPriceRange
    }),
    contradictionMarkerVisible: params.contradictionScore >= 35
  };
}
