import { buildCanonicalCognitionStateFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { buildChartProjectionDelta } from '../delta/chart-projection-delta.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

export function runChartProjectionDeltaTests(): void {
  const previous = buildCanonicalCognitionStateFixture({
    chartProjection: {
      annotationIds: ['a1', 'a2'],
      markerLabels: ['m1', 'm2'],
      emphasisPriceLevels: [100, 101],
      contradictionMarkerVisible: false
    }
  });
  const current = buildCanonicalCognitionStateFixture({
    chartProjection: {
      annotationIds: ['a2', 'a3'],
      markerLabels: ['m2', 'm3'],
      emphasisPriceLevels: [100, 102],
      contradictionMarkerVisible: true
    }
  });

  const delta = buildChartProjectionDelta(previous, current);
  assert(delta.enteredAnnotationIds.join(',') === 'a3', 'entered annotations should follow current order');
  assert(delta.exitedAnnotationIds.join(',') === 'a1', 'exited annotations should follow previous order');
  assert(delta.emphasisLevelChanged === true, 'emphasis level change should use exact ordered numeric comparison');
  assert(delta.contradictionMarkerVisibilityChanged === true, 'contradiction marker visibility should compare exact boolean value');
}
