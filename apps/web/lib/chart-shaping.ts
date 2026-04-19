import type { ChartAnnotation, ChartAnnotationFilters } from '@elceo/types';

export const DEFAULT_ANNOTATION_FILTERS: ChartAnnotationFilters = {
  keyLevelZones: true,
  macroEvents: true,
  contradiction: true,
  evidenceNotes: true,
  impulseOrigins: false
};

export function applyAnnotationFilters(
  annotations: ChartAnnotation[],
  filters: ChartAnnotationFilters,
  densityTarget: 'moderate' | 'high' = 'moderate'
): ChartAnnotation[] {
  const filtered = annotations.filter((annotation) => {
    if (annotation.kind === 'key_level_zone') return filters.keyLevelZones;
    if (annotation.kind === 'macro_event_marker') return filters.macroEvents;
    if (annotation.kind === 'contradiction_marker') return filters.contradiction;
    if (annotation.kind === 'evidence_note') return filters.evidenceNotes;
    if (annotation.kind === 'impulse_origin_placeholder') return filters.impulseOrigins;
    return true;
  });

  const cap = densityTarget === 'moderate' ? 14 : 28;
  return filtered.slice(0, cap);
}

export function buildEvidenceSideNotes(annotations: ChartAnnotation[]): Array<{ id: string; title: string; body: string; timestampUtc: string }> {
  return annotations
    .filter((annotation): annotation is Extract<ChartAnnotation, { kind: 'evidence_note' }> => annotation.kind === 'evidence_note')
    .map((note) => ({
      id: note.annotation_id,
      title: note.title,
      body: note.body,
      timestampUtc: note.timestamp_utc
    }));
}
