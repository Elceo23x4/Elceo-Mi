<<<<<<< HEAD
import type { ContradictionState, DirectionalBias, TimeHorizon } from '@elceo/domain';

type ConfidenceAnatomy = {
  sourceConfidence: number;
  eventStrength: number;
  modelAgreement: number;
  priceConfirmation: number;
  historicalPattern: number;
  contradictionPenalty: number;
};

export type DirectionalPressureComponent = {
  name: string;
  value: number;
};

export type AssetCognitionState = {
  asset_code: string;
  time_horizon: TimeHorizon;
  directional_bias: DirectionalBias;
  confidence_total: number;
  confidence_anatomy: ConfidenceAnatomy;
  directional_pressure_components: DirectionalPressureComponent[];
  contradiction_score: number;
  contradiction_state: ContradictionState;
  supporting_event_ids: string[];
  invalidating_event_ids: string[];
  current_regime?: string;
  freshness_expires_at: string;
  short_explanation?: string;
  deep_explanation?: string;
  ranking_score: number;
};
=======
export {};
>>>>>>> origin/main
