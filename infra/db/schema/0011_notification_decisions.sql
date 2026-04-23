CREATE TABLE IF NOT EXISTS app_notification_decisions (
  decision_id TEXT PRIMARY KEY,
  decision_key TEXT NOT NULL UNIQUE,
  asset TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  trigger_kind TEXT NOT NULL,
  reasoning_run_id TEXT NULL,
  snapshot_id TEXT NULL,
  drift_id TEXT NULL,
  materiality_score DOUBLE PRECISION NOT NULL,
  should_notify BOOLEAN NOT NULL,
  suppression_reason TEXT NULL,
  channels_json JSONB NOT NULL,
  cooldown_until TIMESTAMPTZ NULL,
  headline TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decision_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_decisions_asset_timeframe_created
  ON app_notification_decisions (asset, timeframe, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_decisions_notify_created
  ON app_notification_decisions (should_notify, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_decisions_rule_created
  ON app_notification_decisions (rule_key, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_decisions_reasoning_run
  ON app_notification_decisions (reasoning_run_id);

CREATE INDEX IF NOT EXISTS idx_notification_decisions_drift
  ON app_notification_decisions (drift_id);
