import type { AssetCognitionState, ChartAnnotation, EvidenceAssembly, H4Zone } from '@elceo/types';

export function buildChartAnnotationsDeterministic(assetCode: string, zones: H4Zone[], cognition: AssetCognitionState, evidence: EvidenceAssembly, impulseObservedAt?: string): ChartAnnotation[] {
  const zoneAnnotations: ChartAnnotation[] = zones.map((zone) => ({
    kind: 'key_level_zone',
    annotation_id: `ann-zone-${zone.zone_id}`,
    asset_code: assetCode,
    zone_id: zone.zone_id,
    significance_score: zone.significance_score,
    evidence_ids: evidence.supportingEventIds
  }));

  const macroAnnotations: ChartAnnotation[] = evidence.evidence
    .filter((item) => item.eventClass === 'macro_event')
    .slice(0, 4)
    .map((item) => ({
      kind: 'macro_event_marker',
      annotation_id: `ann-macro-${item.evidenceId}`,
      asset_code: assetCode,
      event_id: item.evidenceId,
      timestamp_utc: item.occurredAtUtc,
      evidence_ids: [item.evidenceId]
    }));

  const contradictionAnnotation: ChartAnnotation = {
    kind: 'contradiction_marker',
    annotation_id: `ann-contradiction-${assetCode}`,
    asset_code: assetCode,
    contradiction_score: cognition.contradiction_score,
    contradiction_state: cognition.contradiction_state,
    evidence_ids: evidence.supportingEventIds
  };

  const evidenceNotes: ChartAnnotation[] = evidence.evidence.slice(0, 5).map((item) => ({
    kind: 'evidence_note',
    annotation_id: `ann-note-${item.evidenceId}`,
    asset_code: assetCode,
    title: item.eventClass.replaceAll('_', ' ').toUpperCase(),
    body: item.summary,
    timestamp_utc: item.occurredAtUtc,
    evidence_ids: [item.evidenceId]
  }));

  const impulsePlaceholder: ChartAnnotation | null = impulseObservedAt ? {
    kind: 'impulse_origin_placeholder',
    annotation_id: `ann-impulse-${assetCode}`,
    asset_code: assetCode,
    timestamp_utc: impulseObservedAt,
    note: 'Impulse origin overlay reserved for dedicated chart-impulse slice.',
    evidence_ids: evidence.supportingEventIds.slice(0, 1)
  } : null;

  return [...zoneAnnotations, ...macroAnnotations, contradictionAnnotation, ...evidenceNotes, ...(impulsePlaceholder ? [impulsePlaceholder] : [])];
}

/** @deprecated Ambient-clock placeholder retained only for the legacy dashboard pipeline. */
export function buildChartAnnotations(assetCode: string, zones: H4Zone[], cognition: AssetCognitionState, evidence: EvidenceAssembly): ChartAnnotation[] {
  return buildChartAnnotationsDeterministic(assetCode, zones, cognition, evidence, new Date().toISOString());
}
