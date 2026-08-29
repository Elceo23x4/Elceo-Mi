export type H4Zone = {
  zone_id: string;
  asset_code: string;
  timeframe: 'H4';
  lower: number;
  upper: number;
  center: number;
  touches: number;
  reaction_magnitude_atr: number;
  hours_since_last_touch: number;
  significance_score: number;
};

export type ContradictionMarkerAnnotation = {
  kind: 'contradiction_marker';
  annotation_id: string;
  asset_code: string;
  contradiction_state: string;
  evidence_ids: string[];
  evidence_lineage?: DashboardContradictionEvidence[];
} & (
  | { contradiction_score: number; contradiction_score_availability?: 'available' }
  | { contradiction_score: null; contradiction_score_availability: 'unavailable' | 'unknown' }
);

export type ChartAnnotation =
  | {
      kind: 'key_level_zone';
      annotation_id: string;
      asset_code: string;
      zone_id: string;
      significance_score: number;
      evidence_ids: string[];
    }
  | {
      kind: 'macro_event_marker';
      annotation_id: string;
      asset_code: string;
      event_id: string;
      timestamp_utc: string;
      evidence_ids: string[];
    }
  | ContradictionMarkerAnnotation
  | {
      kind: 'evidence_note';
      annotation_id: string;
      asset_code: string;
      title: string;
      body: string;
      timestamp_utc: string;
      evidence_ids: string[];
    }
  | {
      kind: 'impulse_origin_placeholder';
      annotation_id: string;
      asset_code: string;
      timestamp_utc: string;
      note: string;
      evidence_ids: string[];
    };

type DashboardCognitionModuleBase = {
  module_id: string;
  title: string;
  body: string;
};

export type DashboardCognitionModule = DashboardCognitionModuleBase & (
  | { rank_score: number; rank_availability?: 'available' }
  | { rank_score: null; rank_availability: 'unavailable' }
);

export type DashboardContradictionEvidence = {
  severity: string;
  source_id: string;
  evidence_ids: string[];
  rationale: string;
};

export type DashboardContradictionDisplay = {
  state: string;
  evidence_lineage?: DashboardContradictionEvidence[];
} & (
  | { score: number; score_availability?: 'available' }
  | { score: null; score_availability: 'unavailable' | 'unknown' }
);

export type DashboardCognitionViewModel = {
  /** Omitted only by explicitly retained legacy-v1 persisted fixtures. */
  contract_version?: 'dashboard-display-v2';
  asset_code: string;
  directional_bias: string;
  confidence_total: number;
  confidence_anatomy: Record<string, number>;
  /** Canonical contradiction evidence does not imply an aggregate score. */
  contradiction: DashboardContradictionDisplay;
  zones: H4Zone[];
  annotations: ChartAnnotation[];
  evidence_notes: ChartAnnotation[];
  modules: DashboardCognitionModule[];
};

export type ChartCandlePoint = {
  timestamp_utc: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type ChartAnnotationFilters = {
  keyLevelZones: boolean;
  macroEvents: boolean;
  contradiction: boolean;
  evidenceNotes: boolean;
  impulseOrigins: boolean;
};

export type DashboardChartWorkspaceViewModel = {
  dashboard: DashboardCognitionViewModel;
  chart: {
    candles: ChartCandlePoint[];
    zones: H4Zone[];
    annotations: ChartAnnotation[];
    default_filters: ChartAnnotationFilters;
    annotation_density_target: 'moderate';
  };
};

/** Deliberately separate, positive-allowlist commercial projection. */
export type KickOffMacroHeadline = {
  headline_id: string;
  title: string;
  source_name: string | null;
  source_url: string | null;
  published_at: string;
  freshness: 'fresh' | 'aging';
};

export type KickOffDashboardViewModelV1 = {
  contract_version: 'kick-off-dashboard-v1';
  access: 'kick_off';
  asset_code: string;
  timeframe: 'H4';
  horizon: import('./market-evidence-weighting').EvidenceWeightHorizon;
  evaluated_at: string;
  chart: {
    candles: ChartCandlePoint[];
    zones: Array<{ zone_id: string; lower: number; upper: number; center: number }>;
  };
  evidence_score:
    | { availability: 'available'; value: number; scale: '0_100' }
    | { availability: 'unavailable'; value: null; scale: '0_100' };
  macro_headlines:
    | { availability: 'available'; items: KickOffMacroHeadline[] }
    | { availability: 'empty'; items: [] }
    | { availability: 'unavailable'; items: [] };
};
