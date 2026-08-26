import type { CanonicalAssetSymbol, CanonicalMarketCandleObservation, ChartAnnotation, DashboardChartWorkspaceViewModel, DashboardCognitionViewModel, EvidenceWeightHorizon, H4Zone, MarketCognitionSnapshot } from '@elceo/types';

export type ChartIntelligenceOutput = {
  zones: H4Zone[];
  annotations: ChartAnnotation[];
  dashboardViewModel: DashboardCognitionViewModel;
};

export const CANONICAL_DASHBOARD_PROJECTION_VERSION = 'canonical-dashboard-projection-v1' as const;
export const CANONICAL_DASHBOARD_DISPLAY_VERSION = 'dashboard-display-v2' as const;
export const CANONICAL_DASHBOARD_ZONE_RULE_VERSION = 'h4-zone-deterministic-v1' as const;
export const CANONICAL_DASHBOARD_POLICY_VERSION = 'canonical-dashboard-policy-v1' as const;

export type CanonicalDashboardProjectionInput = {
  asset: CanonicalAssetSymbol;
  timeframe: 'H4';
  horizon: EvidenceWeightHorizon;
  cognition: MarketCognitionSnapshot;
  cognitionArtifact: {
    identity: string;
    contentHash: string;
    contractVersion: string;
    provenance: string[];
  };
  candles: CanonicalMarketCandleObservation[];
  orderedCandleObservationIds: string[];
  orderedCandleContentHashes: string[];
  evaluatedAt: string;
  chartZoneRuleVersion: typeof CANONICAL_DASHBOARD_ZONE_RULE_VERSION;
  dashboardDisplayContractVersion: typeof CANONICAL_DASHBOARD_DISPLAY_VERSION;
  projectionVersion: typeof CANONICAL_DASHBOARD_PROJECTION_VERSION;
  productPolicyVersion: typeof CANONICAL_DASHBOARD_POLICY_VERSION;
};

export type CanonicalDashboardProjection = {
  projection_version: typeof CANONICAL_DASHBOARD_PROJECTION_VERSION;
  projection_identity: string;
  evaluated_at: string;
  ordered_candle_observation_ids: string[];
  ordered_candle_content_hashes: string[];
  workspace: DashboardChartWorkspaceViewModel;
};
