CREATE TABLE IF NOT EXISTS app_cognition_deltas (
  drift_id TEXT PRIMARY KEY,
  asset TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  previous_snapshot_id TEXT NOT NULL,
  current_snapshot_id TEXT NOT NULL,
  previous_reasoning_run_id TEXT NOT NULL,
  current_reasoning_run_id TEXT NOT NULL,
  compared_at TIMESTAMPTZ NOT NULL,
  severity TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_changes_json JSONB NOT NULL,
  confidence_delta DOUBLE PRECISION NOT NULL,
  contradiction_delta DOUBLE PRECISION NOT NULL,
  freshness_delta DOUBLE PRECISION NOT NULL,
  invalidation_price_delta DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  drift_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cognition_deltas_asset_timeframe_compared
  ON app_cognition_deltas (asset, timeframe, compared_at DESC);

CREATE INDEX IF NOT EXISTS idx_cognition_deltas_current_snapshot_id
  ON app_cognition_deltas (current_snapshot_id);

CREATE INDEX IF NOT EXISTS idx_cognition_deltas_severity_created
  ON app_cognition_deltas (severity, created_at DESC);
