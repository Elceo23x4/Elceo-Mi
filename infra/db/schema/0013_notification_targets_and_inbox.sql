CREATE TABLE IF NOT EXISTS app_notification_targets (
  target_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  target_kind TEXT NOT NULL,
  status TEXT NOT NULL,
  label TEXT NULL,
  address_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_targets_subject_channel_status
  ON app_notification_targets (subject_kind, subject_id, channel, status);

CREATE INDEX IF NOT EXISTS idx_notification_targets_channel_status
  ON app_notification_targets (channel, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_targets_active_unique_address
  ON app_notification_targets (subject_kind, subject_id, channel, target_kind, address_json)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS app_notification_subscriptions (
  subscription_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  asset_scope TEXT NOT NULL,
  timeframe_scope TEXT NOT NULL,
  rule_key_scope TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  min_materiality_score DOUBLE PRECISION NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_subject_channel_enabled
  ON app_notification_subscriptions (subject_kind, subject_id, channel, enabled);

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_channel_enabled
  ON app_notification_subscriptions (channel, enabled);

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_scope
  ON app_notification_subscriptions (asset_scope, timeframe_scope, rule_key_scope);

CREATE TABLE IF NOT EXISTS app_notification_inbox (
  inbox_id TEXT PRIMARY KEY,
  target_id TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  decision_key TEXT NOT NULL,
  asset TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  read_at TIMESTAMPTZ NULL,
  archived_at TIMESTAMPTZ NULL,
  payload_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_inbox_target_created
  ON app_notification_inbox (target_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_inbox_decision_id
  ON app_notification_inbox (decision_id);

CREATE INDEX IF NOT EXISTS idx_notification_inbox_target_read_archived_created
  ON app_notification_inbox (target_id, read_at, archived_at, created_at DESC);

ALTER TABLE app_notification_outbox
  ADD COLUMN IF NOT EXISTS target_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS subject_kind TEXT NULL,
  ADD COLUMN IF NOT EXISTS subject_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS target_key TEXT NULL,
  ADD COLUMN IF NOT EXISTS delivery_address_json JSONB NULL;

CREATE INDEX IF NOT EXISTS idx_notification_outbox_target_channel_status_available
  ON app_notification_outbox (target_id, channel, status, available_at);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_decision_target
  ON app_notification_outbox (decision_id, target_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_outbox_decision_channel_target_key
  ON app_notification_outbox (decision_id, channel, target_key)
  WHERE target_key IS NOT NULL;
