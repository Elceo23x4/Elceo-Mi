CREATE TABLE IF NOT EXISTS app_market_evidence_scheduled_ingestion_runs (
  run_id text PRIMARY KEY,
  job_id text NOT NULL,
  provider_id text NOT NULL,
  capability text NOT NULL,
  asset text NULL,
  region text NULL,
  run_mode text NOT NULL,
  status text NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz NULL,
  request_id text NULL,
  response_status text NULL,
  payload_count integer NOT NULL,
  persisted_payload_ids_json jsonb NOT NULL,
  error_code text NULL,
  error_message text NULL,
  retry_status text NOT NULL,
  retry_count integer NOT NULL,
  next_retry_at timestamptz NULL,
  staleness_status text NOT NULL,
  warnings_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_sched_ing_runs_job_started ON app_market_evidence_scheduled_ingestion_runs (job_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_sched_ing_runs_provider_cap_started ON app_market_evidence_scheduled_ingestion_runs (provider_id, capability, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_sched_ing_runs_asset_started ON app_market_evidence_scheduled_ingestion_runs (asset, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_sched_ing_runs_region_started ON app_market_evidence_scheduled_ingestion_runs (region, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_sched_ing_runs_status_started ON app_market_evidence_scheduled_ingestion_runs (status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_sched_ing_runs_staleness_started ON app_market_evidence_scheduled_ingestion_runs (staleness_status, started_at DESC);
