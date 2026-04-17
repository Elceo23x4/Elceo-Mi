export type AlertClass =
  | 'bias_changes'
  | 'contradiction_spikes'
  | 'key_level_interaction'
  | 'macro_event_incoming'
  | 'post_event_regime_shift'
  | 'journal_coaching_reminder';

export type InAppAlert = {
  alert_id: string;
  user_id: string;
  asset_code: string;
  alert_class: AlertClass;
  title: string;
  body: string;
  fingerprint: string;
  created_at_utc: string;
  read_at_utc?: string;
  metadata: Record<string, unknown>;
};

export type AuditLogEntry = {
  log_id: string;
  actor_user_id?: string;
  scope: 'alerts' | 'admin' | 'application_state' | 'ingestion' | 'reasoning';
  action: string;
  details: Record<string, unknown>;
  created_at_utc: string;
};

export type AdminExplainabilityRow = {
  asset_code: string;
  directional_bias: string;
  confidence_total: number;
  confidence_anatomy: Record<string, number>;
  contradiction: { score: number; state: string };
  freshness_expires_at: string;
  supporting_event_ids: string[];
  invalidating_event_ids: string[];
  short_explanation?: string;
  deep_explanation?: string;
};

export type ProviderFreshnessRow = {
  asset_code: string;
  freshness_expires_at: string;
  minutes_remaining: number;
  status: 'fresh' | 'expiring' | 'stale';
};
