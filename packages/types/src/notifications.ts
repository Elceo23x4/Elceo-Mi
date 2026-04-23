import type { CanonicalAssetSymbol, Timeframe } from './events';
import type { CanonicalCognitionState } from './cognition';

export type NotificationChannel = 'in_app' | 'email' | 'push' | 'sms' | 'webhook';

export type NotificationTriggerKind =
  | 'contradiction_spike'
  | 'invalidation_breach'
  | 'state_flip'
  | 'confidence_drop'
  | 'macro_event_imminent'
  | 'macro_event_live'
  | 'evidence_refresh'
  | 'freshness_decay'
  | 'watchlist_signal'
  | 'admin_source_failure'
  | 'admin_staleness'
  | 'admin_replay_ready'
  | 'reasoning_failure'
  | 'reasoning_degraded'
  | 'cognition_initialized'
  | 'bias_flip'
  | 'critical_drift'
  | 'major_drift'
  | 'invalidation_risk_upgrade'
  | 'confidence_breakdown';

export type NotificationPolicyRuleKey =
  | 'reasoning_failure'
  | 'reasoning_degraded'
  | 'cognition_initialized'
  | 'bias_flip'
  | 'critical_drift'
  | 'major_drift'
  | 'invalidation_risk_upgrade'
  | 'contradiction_spike'
  | 'confidence_breakdown'
  | 'freshness_decay';

export type NotificationSuppressionReason =
  | 'condition_not_met'
  | 'below_materiality_threshold'
  | 'cooldown_active'
  | 'missing_required_context';

export type NotificationMaterialityBand = 'low' | 'medium' | 'high' | 'critical';

export type NotificationTriggerRule = {
  triggerKind: NotificationTriggerKind;
  asset: CanonicalAssetSymbol | null;
  timeframe: Timeframe | null;
  enabled: boolean;
  threshold: number | null;
  cooldownMinutes: number;
  suppressionWindowMinutes: number;
  entitlementRequired: string | null;
  channels: NotificationChannel[];
  version: string;
  ruleKey?: NotificationPolicyRuleKey;
  minMaterialityScore?: number;
};

export type NotificationTriggerContext = {
  cognition: CanonicalCognitionState;
  previousCognition: CanonicalCognitionState | null;
  asOf: string;
  userId: string | null;
  watchlistMatch: boolean;
  adminMode: boolean;
  reasoningRunId?: string;
  snapshotId?: string | null;
  driftId?: string | null;
};

export type NotificationDecision = {
  shouldFire: boolean;
  reason: string;
  triggerKind: NotificationTriggerKind;
  channels: NotificationChannel[];
  cooldownApplied: boolean;
  suppressionApplied: boolean;
  evidenceIds: string[];
  createdAt: string;
  decisionId?: string;
  decisionKey?: string;
  asset?: CanonicalAssetSymbol;
  timeframe?: Timeframe;
  ruleKey?: NotificationPolicyRuleKey;
  reasoningRunId?: string | null;
  snapshotId?: string | null;
  driftId?: string | null;
  shouldNotify?: boolean;
  materialityScore?: number;
  materialityBand?: NotificationMaterialityBand;
  minMaterialityScore?: number;
  suppressionReason?: NotificationSuppressionReason | null;
  cooldownUntil?: string | null;
  headline?: string;
  body?: string;
  evaluatedAt?: string;
};
