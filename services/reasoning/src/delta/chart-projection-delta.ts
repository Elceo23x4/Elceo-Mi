import type { CanonicalCognitionState } from '@elceo/types';
import type { ChartProjectionDelta } from './contracts';

function arraysEqualExact(left: number[], right: number[]): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

export function buildChartProjectionDelta(previous: CanonicalCognitionState, current: CanonicalCognitionState): ChartProjectionDelta {
  const previousAnnotationIds = [...previous.chartProjection.annotationIds];
  const currentAnnotationIds = [...current.chartProjection.annotationIds];

  return {
    previousAnnotationIds,
    currentAnnotationIds,
    enteredAnnotationIds: currentAnnotationIds.filter((id) => !previousAnnotationIds.includes(id)),
    exitedAnnotationIds: previousAnnotationIds.filter((id) => !currentAnnotationIds.includes(id)),
    previousEmphasisLevels: [...previous.chartProjection.emphasisPriceLevels],
    currentEmphasisLevels: [...current.chartProjection.emphasisPriceLevels],
    emphasisLevelChanged: !arraysEqualExact(previous.chartProjection.emphasisPriceLevels, current.chartProjection.emphasisPriceLevels),
    contradictionMarkerVisibilityChanged:
      previous.chartProjection.contradictionMarkerVisible !== current.chartProjection.contradictionMarkerVisible
  };
}
