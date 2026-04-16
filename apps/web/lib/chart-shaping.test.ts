import { applyAnnotationFilters, buildEvidenceSideNotes, DEFAULT_ANNOTATION_FILTERS } from './chart-shaping';
import type { ChartAnnotation } from '@elceo/types';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export function runChartShapingTests(): void {
  const annotations: ChartAnnotation[] = [
    {
      kind: 'key_level_zone',
      annotation_id: 'zone-1',
      asset_code: 'XAU/USD',
      zone_id: 'z1',
      significance_score: 82,
      evidence_ids: []
    },
    {
      kind: 'macro_event_marker',
      annotation_id: 'macro-1',
      asset_code: 'XAU/USD',
      event_id: 'm1',
      timestamp_utc: new Date().toISOString(),
      evidence_ids: []
    },
    {
      kind: 'evidence_note',
      annotation_id: 'note-1',
      asset_code: 'XAU/USD',
      title: 'MACRO EVENT',
      body: 'CPI surprise impacted gold.',
      timestamp_utc: new Date().toISOString(),
      evidence_ids: []
    }
  ];

  const withoutMacro = applyAnnotationFilters(annotations, { ...DEFAULT_ANNOTATION_FILTERS, macroEvents: false });
  assert(withoutMacro.every((item) => item.kind !== 'macro_event_marker'), 'macro filter should remove macro markers');

  const notes = buildEvidenceSideNotes(annotations);
  assert(notes.length === 1 && notes[0]?.title === 'MACRO EVENT', 'evidence side notes should shape note metadata');
}
