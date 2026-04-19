import type { AssetCognitionState, ChartAnnotation, DashboardCognitionModule, DashboardCognitionViewModel, H4Zone } from '@elceo/types';

export function buildDashboardViewModel(cognition: AssetCognitionState, zones: H4Zone[], annotations: ChartAnnotation[]): DashboardCognitionViewModel {
  const modules: DashboardCognitionModule[] = [
    {
      module_id: 'directional-bias',
      title: 'Directional Bias',
      rank_score: cognition.ranking_score,
      body: `${cognition.directional_bias.toUpperCase()} bias for ${cognition.time_horizon} horizon.`
    },
    {
      module_id: 'confidence-anatomy',
      title: 'Confidence Anatomy',
      rank_score: cognition.confidence_total,
      body: `Confidence ${cognition.confidence_total.toFixed(1)} with anatomy breakdown preserved.`
    },
    {
      module_id: 'contradiction',
      title: 'Contradiction / Tension',
      rank_score: 100 - cognition.contradiction_score,
      body: `${cognition.contradiction_state} (score ${cognition.contradiction_score.toFixed(1)}).`
    },
    {
      module_id: 'evidence-surface',
      title: 'Evidence Surface',
      rank_score: 72,
      body: `${annotations.filter((item) => item.kind === 'evidence_note').length} linked notes prepared for side-panel rendering.`
    }
  ].sort((a, b) => b.rank_score - a.rank_score);

  const evidenceNotes = annotations.filter((item) => item.kind === 'evidence_note');

  return {
    asset_code: cognition.asset_code,
    directional_bias: cognition.directional_bias,
    confidence_total: cognition.confidence_total,
    confidence_anatomy: cognition.confidence_anatomy,
    contradiction: {
      score: cognition.contradiction_score,
      state: cognition.contradiction_state
    },
    zones,
    annotations,
    evidence_notes: evidenceNotes,
    modules
  };
}
