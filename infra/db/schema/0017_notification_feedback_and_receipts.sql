CREATE TABLE IF NOT EXISTS app_notification_provider_events (
  provider_event_id TEXT PRIMARY KEY,
  provider_kind TEXT NOT NULL,
  channel TEXT NOT NULL,
  provider_message_id TEXT NULL,
  event_kind TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  target_id TEXT NULL,
  outbox_id TEXT NULL,
  attempt_id TEXT NULL,
  decision_id TEXT NULL,
  decision_key TEXT NULL,
  reason_code TEXT NULL,
  reason_message TEXT NULL,
  raw_event_json JSONB NOT NULL,
  normalized_meta_json JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_provider_events_provider_occurred ON app_notification_provider_events (provider_kind, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_provider_events_provider_message_id ON app_notification_provider_events (provider_message_id);
CREATE INDEX IF NOT EXISTS idx_notification_provider_events_outbox_id ON app_notification_provider_events (outbox_id);
CREATE INDEX IF NOT EXISTS idx_notification_provider_events_target_occurred ON app_notification_provider_events (target_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_provider_events_kind_occurred ON app_notification_provider_events (event_kind, occurred_at DESC);

CREATE TABLE IF NOT EXISTS app_notification_delivery_receipts (
  receipt_id TEXT PRIMARY KEY,
  provider_event_id TEXT NULL,
  provider_kind TEXT NOT NULL,
  channel TEXT NOT NULL,
  decision_id TEXT NULL,
  decision_key TEXT NULL,
  outbox_id TEXT NULL,
  attempt_id TEXT NULL,
  target_id TEXT NULL,
  subject_kind TEXT NULL,
  subject_id TEXT NULL,
  provider_message_id TEXT NULL,
  event_kind TEXT NOT NULL,
  severity TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  reason_code TEXT NULL,
  reason_message TEXT NULL,
  raw_event_json JSONB NOT NULL,
  normalized_meta_json JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_delivery_receipts_target_occurred ON app_notification_delivery_receipts (target_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_receipts_decision_occurred ON app_notification_delivery_receipts (decision_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_receipts_outbox_occurred ON app_notification_delivery_receipts (outbox_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_delivery_receipts_kind_severity_occurred ON app_notification_delivery_receipts (event_kind, severity, occurred_at DESC);

CREATE TABLE IF NOT EXISTS app_notification_target_health (
  target_id TEXT PRIMARY KEY,
  health_state TEXT NOT NULL,
  last_receipt_kind TEXT NULL,
  last_receipt_at TIMESTAMPTZ NULL,
  soft_failure_count INTEGER NOT NULL DEFAULT 0,
  hard_failure_count INTEGER NOT NULL DEFAULT 0,
  complaint_count INTEGER NOT NULL DEFAULT 0,
  unsubscribe_count INTEGER NOT NULL DEFAULT 0,
  invalid_target_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE app_notification_outbox_attempts
  ADD COLUMN IF NOT EXISTS provider_kind TEXT NULL,
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS receipt_status TEXT NULL;
