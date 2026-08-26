import type { AssetCognitionState, ChartAnnotation, DashboardCognitionModule, DashboardCognitionViewModel, H4Zone } from '@elceo/types';

export function sortDashboardModules(modules: DashboardCognitionModule[]): DashboardCognitionModule[] {
  return [...modules].sort((a, b) => {
    if (a.rank_score === null && b.rank_score === null) return a.module_id.localeCompare(b.module_id);
    if (a.rank_score === null) return 1;
    if (b.rank_score === null) return -1;
    return b.rank_score - a.rank_score || a.module_id.localeCompare(b.module_id);
  });
}

/**
 * @deprecated Legacy AssetCognitionState compatibility only.
 * Its historical inverse contradiction rank is not canonical cognition authority.
 */
export function buildLegacyDashboardViewModel(cognition: AssetCognitionState, zones: H4Zone[], annotations: ChartAnnotation[]): DashboardCognitionViewModel {
  const modules: DashboardCognitionModule[] = ([
    {
      module_id: 'directional-bias',
      title: 'Directional Bias',
      rank_score: cognition.ranking_score,
      rank_availability: 'available',
      body: `${cognition.directional_bias.toUpperCase()} bias for ${cognition.time_horizon} horizon.`
    },
    {
      module_id: 'confidence-anatomy',
      title: 'Confidence Anatomy',
      rank_score: cognition.confidence_total,
      rank_availability: 'available',
      body: `Confidence ${cognition.confidence_total.toFixed(1)} with anatomy breakdown preserved.`
    },
    {
      module_id: 'contradiction',
      title: 'Contradiction / Tension',
      rank_score: 100 - cognition.contradiction_score,
      rank_availability: 'available',
      body: `${cognition.contradiction_state} (score ${cognition.contradiction_score.toFixed(1)}).`
    },
    {
      module_id: 'evidence-surface',
      title: 'Evidence Surface',
      rank_score: null,
      rank_availability: 'unavailable',
      body: `${annotations.filter((item) => item.kind === 'evidence_note').length} linked notes prepared for side-panel rendering.`
    }
  ] satisfies DashboardCognitionModule[]);

  const evidenceNotes = annotations.filter((item) => item.kind === 'evidence_note');

  return {
    asset_code: cognition.asset_code,
    directional_bias: cognition.directional_bias,
    confidence_total: cognition.confidence_total,
    confidence_anatomy: cognition.confidence_anatomy,
    contradiction: {
      score: cognition.contradiction_score,
      score_availability: 'available',
      state: cognition.contradiction_state
    },
    zones,
    annotations,
    evidence_notes: evidenceNotes,
    modules: sortDashboardModules(modules)
  };
}
