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

export type NotificationSubjectKind = 'user' | 'workspace' | 'ops';

export type NotificationTargetChannelStatus = 'active' | 'disabled' | 'unverified';

export type NotificationTargetKind = 'in_app_user' | 'email_address' | 'push_endpoint';

export type NotificationTargetRecord = {
  targetId: string;
  targetKey?: string;
  subjectKind: NotificationSubjectKind;
  subjectId: string;
  channel: NotificationChannel;
  targetKind: NotificationTargetKind;
  status: NotificationTargetChannelStatus;
  label: string | null;
  addressJson: string;
  createdAt: string;
  updatedAt: string;
  verifiedAt: string | null;
};

export type NotificationSubscriptionRecord = {
  subscriptionId: string;
  subscriptionKey?: string;
  subjectKind: NotificationSubjectKind;
  subjectId: string;
  channel: NotificationChannel;
  asset: CanonicalAssetSymbol | '*';
  timeframe: Timeframe | '*';
  ruleKey: string | '*';
  enabled: boolean;
  minMaterialityScore: number | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationInboxRecord = {
  inboxId: string;
  targetId: string;
  decisionId: string;
  decisionKey: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  ruleKey: string;
  headline: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  archivedAt: string | null;
  payloadJson: string;
};


export type NotificationTargetVerificationStatus = 'pending' | 'verified' | 'expired' | 'consumed' | 'canceled';

export type NotificationVerificationKind = 'email_verification' | 'push_verification';

export type NotificationVerificationRecord = {
  verificationId: string;
  verificationKey: string;
  targetId: string;
  subjectKind: NotificationSubjectKind;
  subjectId: string;
  channel: NotificationChannel;
  verificationKind: NotificationVerificationKind;
  tokenHash: string;
  issuedAt: string;
  expiresAt: string;
  consumedAt: string | null;
  status: NotificationTargetVerificationStatus;
  attemptCount: number;
  lastAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationVerificationIssueResult = {
  verificationId: string;
  targetId: string;
  verificationKind: NotificationVerificationKind;
  issuedAt: string;
  expiresAt: string;
  rawToken: string;
  alreadyActive: boolean;
};

export type NotificationVerificationConsumeResult = {
  verificationId: string;
  targetId: string;
  verified: boolean;
  reason: string | null;
};

export type NotificationProviderEventKind =
  | 'accepted'
  | 'delivered'
  | 'bounced'
  | 'complained'
  | 'unsubscribed'
  | 'invalid_target'
  | 'provider_failed'
  | 'unknown';

export type NotificationReceiptSeverity = 'info' | 'warning' | 'critical';

export type NotificationDeliveryReceipt = {
  receiptId: string;
  providerEventId: string | null;
  providerKind: string;
  channel: NotificationChannel;
  decisionId: string | null;
  decisionKey: string | null;
  outboxId: string | null;
  attemptId: string | null;
  targetId: string | null;
  subjectKind: NotificationSubjectKind | null;
  subjectId: string | null;
  providerMessageId: string | null;
  eventKind: NotificationProviderEventKind;
  severity: NotificationReceiptSeverity;
  occurredAt: string;
  reasonCode: string | null;
  reasonMessage: string | null;
  rawEventJson: string;
  normalizedMetaJson: string | null;
  createdAt: string;
};

export type NotificationTargetHealthState = 'healthy' | 'warning' | 'degraded' | 'disabled';

export type NotificationTargetHealthRecord = {
  targetId: string;
  healthState: NotificationTargetHealthState;
  lastReceiptKind: NotificationProviderEventKind | null;
  lastReceiptAt: string | null;
  softFailureCount: number;
  hardFailureCount: number;
  complaintCount: number;
  unsubscribeCount: number;
  invalidTargetCount: number;
  updatedAt: string;
};
