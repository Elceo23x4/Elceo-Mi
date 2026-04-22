CREATE TABLE IF NOT EXISTS app_ingestion_runs (
  run_id TEXT PRIMARY KEY,
  asset TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  mode TEXT NOT NULL,
  active_boundary TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,
  canonical_event_count INTEGER NOT NULL,
  legacy_event_count INTEGER,
  output_event_count INTEGER NOT NULL,
  fallback_applied BOOLEAN NOT NULL,
  fallback_reason TEXT,
  boundary_version TEXT NOT NULL,
  overlap_ratio DOUBLE PRECISION,
  comparison_json JSONB,
  diagnostics_summary_json JSONB NOT NULL,
  provider_capabilities_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_asset_timeframe_created
  ON app_ingestion_runs (asset, timeframe, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_status_created
  ON app_ingestion_runs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_started_at
  ON app_ingestion_runs (started_at DESC);

CREATE TABLE IF NOT EXISTS app_ingestion_event_snapshots (
  run_id TEXT NOT NULL REFERENCES app_ingestion_runs(run_id) ON DELETE CASCADE,
  asset TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  event_id TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  relevance_score DOUBLE PRECISION NOT NULL,
  impact TEXT NOT NULL,
  source_category TEXT NOT NULL,
  source_name TEXT NOT NULL,
  event_kind TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL,
  stale BOOLEAN NOT NULL,
  canonical_event_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (run_id, event_id),
  UNIQUE (run_id, dedupe_key, event_id)
);

CREATE INDEX IF NOT EXISTS idx_ingestion_snapshots_run_id
  ON app_ingestion_event_snapshots (run_id);

CREATE INDEX IF NOT EXISTS idx_ingestion_snapshots_asset_timeframe_rank
  ON app_ingestion_event_snapshots (asset, timeframe, relevance_score DESC, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingestion_snapshots_dedupe_key
  ON app_ingestion_event_snapshots (dedupe_key);

CREATE INDEX IF NOT EXISTS idx_ingestion_snapshots_event_kind_created
  ON app_ingestion_event_snapshots (event_kind, created_at DESC);
