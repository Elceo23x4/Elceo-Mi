ALTER TABLE app_ingestion_runs
  ADD COLUMN IF NOT EXISTS trigger_kind TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS request_key TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS slot_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS slot_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduler_tick_id TEXT;

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_trigger_slot
  ON app_ingestion_runs (trigger_kind, slot_start_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_request_key
  ON app_ingestion_runs (request_key);

CREATE TABLE IF NOT EXISTS app_ingestion_runtime_leases (
  request_key TEXT PRIMARY KEY,
  asset TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  mode TEXT NOT NULL,
  trigger_kind TEXT NOT NULL,
  slot_start_at TIMESTAMPTZ,
  slot_end_at TIMESTAMPTZ,
  lease_holder TEXT NOT NULL,
  acquired_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_runtime_leases_asset_timeframe_created
  ON app_ingestion_runtime_leases (asset, timeframe, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingestion_runtime_leases_expires_at
  ON app_ingestion_runtime_leases (expires_at);

CREATE INDEX IF NOT EXISTS idx_ingestion_runtime_leases_status_updated
  ON app_ingestion_runtime_leases (status, updated_at DESC);
