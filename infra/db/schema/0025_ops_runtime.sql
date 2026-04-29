CREATE TABLE IF NOT EXISTS app_ops_job_leases (
  lease_id TEXT PRIMARY KEY,
  job_kind TEXT NOT NULL,
  scope_kind TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  lease_state TEXT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  holder_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ops_job_leases_scope ON app_ops_job_leases (job_kind, scope_kind, scope_key);
CREATE INDEX IF NOT EXISTS idx_ops_job_leases_state_expires ON app_ops_job_leases (lease_state, expires_at);
CREATE INDEX IF NOT EXISTS idx_ops_job_leases_created_desc ON app_ops_job_leases (created_at DESC);

CREATE TABLE IF NOT EXISTS app_ops_job_runs (
  run_id TEXT PRIMARY KEY,
  job_kind TEXT NOT NULL,
  trigger_kind TEXT NOT NULL,
  scope_kind TEXT NOT NULL,
  scope_key TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL,
  warnings_json JSONB NOT NULL,
  failure_reason TEXT,
  child_report_ids_json JSONB NOT NULL,
  metrics_json JSONB NOT NULL,
  report_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ops_job_runs_job_created ON app_ops_job_runs (job_kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_job_runs_status_created ON app_ops_job_runs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_job_runs_scope_created ON app_ops_job_runs (scope_kind, scope_key, created_at DESC);
