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
  | 'admin_replay_ready';

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
};

export type NotificationTriggerContext = {
  cognition: CanonicalCognitionState;
  previousCognition: CanonicalCognitionState | null;
  asOf: string;
  userId: string | null;
  watchlistMatch: boolean;
  adminMode: boolean;
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
};
