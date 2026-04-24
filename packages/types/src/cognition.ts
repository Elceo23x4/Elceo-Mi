/**
 * Canonical cognition contracts.
 * Canonical-first rule: all new ingestion/reasoning/notification/chart/admin code must consume these contracts.
 */
import type {
  BiasState,
  CanonicalAssetSymbol,
  CanonicalEvent,
  ContradictionRegime,
  JournalInfluenceFlag,
  RankedEvidenceItem,
  Timeframe
} from './events';
import type { JournalInfluenceSummary } from './journal-influence';
import type { InvalidationState, ZoneSignificance } from './zones';

export type ConfidenceAnatomy = {
  sourceIntegrity: number;
  eventAlignment: number;
  priceAcceptance: number;
  contradictionPenalty: number;
  stalenessPenalty: number;
  weightedScore: number;
  componentsVersion: string;
};

export type ContradictionAnatomy = {
  narrativeConflict: number;
  priceConflict: number;
  eventConflict: number;
  macroConflict: number;
  timeframeConflict: number;
  weightedScore: number;
  regime: ContradictionRegime;
  componentsVersion: string;
};

export type FreshnessState = {
  freshnessScore: number;
  hoursSinceLastMaterialUpdate: number;
  lastMaterialUpdateAt: string;
  decayRatePerHour: number;
  stale: boolean;
  staleThresholdHours: number;
  componentsVersion: string;
};

export type CanonicalCognitionState = {
  cognitionId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  evaluatedAt: string;
  evaluationWindowStart: string | null;
  evaluationWindowEnd: string | null;
  bias: BiasState;
  biasLabel: string;
  thesis: string;
  narrativeSummary: string;
  confidence: {
    score: number;
    anatomy: ConfidenceAnatomy;
  };
  contradiction: {
    score: number;
    regime: ContradictionRegime;
    anatomy: ContradictionAnatomy;
    summary: string;
  };
  freshness: FreshnessState;
  invalidation: InvalidationState;
  evidence: {
    ranked: RankedEvidenceItem[];
    topEvidenceIds: string[];
    evidenceCount: number;
  };
  zones: {
    primary: ZoneSignificance[];
    secondary: ZoneSignificance[];
    activeZoneIds: string[];
  };
  explanation: {
    concise: string;
    expanded: string;
    bulletReasons: string[];
    supportingReasons: string[];
    contradictoryReasons: string[];
    whatWouldChangeState: string[];
  };
  supportEvents: {
    linkedEventIds: string[];
    catalystCount: number;
    macroEventIds: string[];
    newsEventIds: string[];
    geopoliticsEventIds: string[];
  };
  chartProjection: {
    annotationIds: string[];
    markerLabels: string[];
    emphasisPriceLevels: number[];
    contradictionMarkerVisible: boolean;
  };
  audit: {
    reasoningVersion: string;
    scoringVersion: string;
    evaluatedBy: string;
    dataCutoffAt: string;
  };
};

export type ReasoningInputFrame = {
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  asOf: string;
  events: CanonicalEvent[];
  evidenceCandidates: RankedEvidenceItem[];
  zones: ZoneSignificance[];
  latestPrice: number;
  recentPriceRange: {
    high: number;
    low: number;
    close: number;
  };
  priorCognition: CanonicalCognitionState | null;
  userJournalInfluence: {
    enabled: boolean;
    influenceFlag: JournalInfluenceFlag;
    linkedEntryIds: string[];
    summary: JournalInfluenceSummary | null;
  };
  config: {
    scoringVersion: string;
    reasoningVersion: string;
  };
};

export interface ReasoningEngineContract {
  evaluate(input: ReasoningInputFrame): Promise<CanonicalCognitionState> | CanonicalCognitionState;
}

export type DirectionalPressureComponent = {
  name: string;
  value: number;
};

/**
 * @deprecated Legacy compatibility shape.
 * Canonical replacement: CanonicalCognitionState.
 * Migration target: map legacy readers/writers via legacy-bridges.ts and stop emitting this in new code.
 */
export type AssetCognitionState = {
  asset_code: string;
  time_horizon: 'intraday' | 'swing';
  directional_bias: BiasState;
  confidence_total: number;
  confidence_anatomy: {
    sourceConfidence: number;
    eventStrength: number;
    modelAgreement: number;
    priceConfirmation: number;
    historicalPattern: number;
    contradictionPenalty: number;
  };
  directional_pressure_components: DirectionalPressureComponent[];
  contradiction_score: number;
  contradiction_state: string;
  supporting_event_ids: string[];
  invalidating_event_ids: string[];
  current_regime?: string;
  freshness_expires_at: string;
  short_explanation?: string;
  deep_explanation?: string;
  ranking_score: number;
};
