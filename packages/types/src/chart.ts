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
  | {
      kind: 'contradiction_marker';
      annotation_id: string;
      asset_code: string;
      contradiction_score: number;
      contradiction_state: string;
      evidence_ids: string[];
    }
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

export type DashboardCognitionModule = {
  module_id: string;
  title: string;
  rank_score: number;
  body: string;
};

export type DashboardCognitionViewModel = {
  asset_code: string;
  directional_bias: string;
  confidence_total: number;
  confidence_anatomy: Record<string, number>;
  contradiction: {
    score: number;
    state: string;
  };
  zones: H4Zone[];
  annotations: ChartAnnotation[];
  evidence_notes: ChartAnnotation[];
  modules: DashboardCognitionModule[];
};
