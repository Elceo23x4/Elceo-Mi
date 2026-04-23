CREATE TABLE IF NOT EXISTS app_ingestion_outbox (
  outbox_id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  request_key TEXT NOT NULL,
  item_kind TEXT NOT NULL,
  topic TEXT NOT NULL,
  asset TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  trigger_kind TEXT NOT NULL,
  slot_start_at TIMESTAMPTZ,
  slot_end_at TIMESTAMPTZ,
  scheduler_tick_id TEXT,
  dedupe_key TEXT NOT NULL UNIQUE,
  payload_json JSONB NOT NULL,
  status TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  last_error_code TEXT,
  last_error_message TEXT,
  available_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_outbox_status_available_created
  ON app_ingestion_outbox (status, available_at, created_at);

CREATE INDEX IF NOT EXISTS idx_ingestion_outbox_run_id
  ON app_ingestion_outbox (run_id);

CREATE INDEX IF NOT EXISTS idx_ingestion_outbox_asset_timeframe_created
  ON app_ingestion_outbox (asset, timeframe, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingestion_outbox_topic_status_created
  ON app_ingestion_outbox (topic, status, created_at DESC);

CREATE TABLE IF NOT EXISTS app_ingestion_outbox_attempts (
  attempt_id TEXT PRIMARY KEY,
  outbox_id TEXT NOT NULL REFERENCES app_ingestion_outbox(outbox_id) ON DELETE CASCADE,
  attempted_at TIMESTAMPTZ NOT NULL,
  transport TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_ingestion_outbox_attempts_outbox_attempted
  ON app_ingestion_outbox_attempts (outbox_id, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_ingestion_outbox_attempts_success_attempted
  ON app_ingestion_outbox_attempts (success, attempted_at DESC);
