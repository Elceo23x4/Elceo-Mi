CREATE TABLE IF NOT EXISTS app_snapshot_refresh_runs (
  refresh_run_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  trigger_kind TEXT NOT NULL,
  overall_status TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  refreshed_domains_json JSONB NOT NULL,
  failed_domains_json JSONB NOT NULL,
  stale_domains_json JSONB NOT NULL,
  warnings_json JSONB NOT NULL,
  report_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshot_refresh_runs_subject_generated
  ON app_snapshot_refresh_runs (subject_kind, subject_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_snapshot_refresh_runs_trigger_generated
  ON app_snapshot_refresh_runs (trigger_kind, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_snapshot_refresh_runs_status_generated
  ON app_snapshot_refresh_runs (overall_status, generated_at DESC);

CREATE TABLE IF NOT EXISTS app_snapshot_freshness (
  freshness_id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  asset_scope TEXT NOT NULL,
  timeframe_scope TEXT NOT NULL,
  latest_snapshot_id TEXT,
  freshness_state TEXT NOT NULL,
  dependency_state TEXT NOT NULL,
  snapshot_generated_at TIMESTAMPTZ,
  evaluated_at TIMESTAMPTZ NOT NULL,
  age_minutes DOUBLE PRECISION,
  max_fresh_minutes INTEGER NOT NULL,
  failure_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_snapshot_freshness_scope
  ON app_snapshot_freshness (domain, subject_kind, subject_id, asset_scope, timeframe_scope);

CREATE INDEX IF NOT EXISTS idx_snapshot_freshness_subject_updated
  ON app_snapshot_freshness (subject_kind, subject_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_snapshot_freshness_state_updated
  ON app_snapshot_freshness (freshness_state, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_snapshot_freshness_domain_updated
  ON app_snapshot_freshness (domain, updated_at DESC);
