CREATE TABLE IF NOT EXISTS app_reasoning_runs (
  reasoning_run_id TEXT PRIMARY KEY,
  asset TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  source_ingestion_run_id TEXT,
  source_ingestion_request_key TEXT,
  engine_name TEXT NOT NULL,
  reasoning_version TEXT NOT NULL,
  scoring_version TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL,
  input_event_count INTEGER NOT NULL,
  input_zone_count INTEGER NOT NULL,
  projected_evidence_count INTEGER NOT NULL,
  prior_snapshot_id TEXT,
  snapshot_id TEXT,
  failure_reason TEXT,
  warnings_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reasoning_runs_asset_timeframe_created
  ON app_reasoning_runs (asset, timeframe, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reasoning_runs_source_ingestion_run_id
  ON app_reasoning_runs (source_ingestion_run_id);

CREATE INDEX IF NOT EXISTS idx_reasoning_runs_status_created
  ON app_reasoning_runs (status, created_at DESC);

CREATE TABLE IF NOT EXISTS app_cognition_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  reasoning_run_id TEXT NOT NULL UNIQUE,
  asset TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  evaluated_at TIMESTAMPTZ NOT NULL,
  bias TEXT NOT NULL,
  confidence_score DOUBLE PRECISION NOT NULL,
  contradiction_score DOUBLE PRECISION NOT NULL,
  freshness_score DOUBLE PRECISION NOT NULL,
  source_ingestion_run_id TEXT,
  source_ingestion_request_key TEXT,
  reasoning_version TEXT NOT NULL,
  scoring_version TEXT NOT NULL,
  cognition_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cognition_snapshots_asset_timeframe_evaluated
  ON app_cognition_snapshots (asset, timeframe, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_cognition_snapshots_source_ingestion_run_id
  ON app_cognition_snapshots (source_ingestion_run_id);

CREATE INDEX IF NOT EXISTS idx_cognition_snapshots_bias_created
  ON app_cognition_snapshots (bias, created_at DESC);
