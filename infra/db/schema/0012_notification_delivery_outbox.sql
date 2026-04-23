CREATE TABLE IF NOT EXISTS app_notification_outbox (
  outbox_id TEXT PRIMARY KEY,
  outbox_key TEXT NOT NULL UNIQUE,
  decision_id TEXT NOT NULL,
  decision_key TEXT NOT NULL,
  asset TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  available_at TIMESTAMPTZ NOT NULL,
  last_attempt_at TIMESTAMPTZ NULL,
  delivered_at TIMESTAMPTZ NULL,
  dead_at TIMESTAMPTZ NULL,
  attempt_count INTEGER NOT NULL,
  last_error_code TEXT NULL,
  last_error_message TEXT NULL,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_status_available
  ON app_notification_outbox (status, available_at);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_decision_id
  ON app_notification_outbox (decision_id);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_channel_status_available
  ON app_notification_outbox (channel, status, available_at);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_asset_timeframe_created
  ON app_notification_outbox (asset, timeframe, created_at DESC);

CREATE TABLE IF NOT EXISTS app_notification_outbox_attempts (
  attempt_id TEXT PRIMARY KEY,
  outbox_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  error_code TEXT NULL,
  error_message TEXT NULL,
  response_meta_json JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_attempts_outbox_attempted
  ON app_notification_outbox_attempts (outbox_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_attempts_channel_attempted
  ON app_notification_outbox_attempts (channel, attempted_at DESC);
