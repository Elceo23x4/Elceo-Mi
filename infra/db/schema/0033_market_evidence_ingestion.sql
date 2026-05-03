CREATE TABLE IF NOT EXISTS app_provider_source_requests (
  request_id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  asset TEXT NULL,
  region TEXT NULL,
  evidence_type_id TEXT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  params_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_source_requests_provider_capability_requested
  ON app_provider_source_requests (provider_id, capability, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_source_requests_asset_requested
  ON app_provider_source_requests (asset, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_source_requests_region_requested
  ON app_provider_source_requests (region, requested_at DESC);

CREATE TABLE IF NOT EXISTS app_provider_source_responses (
  request_id TEXT PRIMARY KEY REFERENCES app_provider_source_requests(request_id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  status TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL,
  source_url TEXT NULL,
  raw_payload_json JSONB NULL,
  error_code TEXT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_source_responses_provider_capability_fetched
  ON app_provider_source_responses (provider_id, capability, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_source_responses_status_fetched
  ON app_provider_source_responses (status, fetched_at DESC);

CREATE TABLE IF NOT EXISTS app_normalized_market_evidence_payloads (
  payload_id TEXT PRIMARY KEY,
  evidence_type_id TEXT NOT NULL,
  evidence_class TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  source_id TEXT NULL,
  region TEXT NOT NULL,
  asset TEXT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ NULL,
  normalized_at TIMESTAMPTZ NOT NULL,
  confidence_score DOUBLE PRECISION NOT NULL,
  data_quality TEXT NOT NULL,
  values_json JSONB NOT NULL,
  metadata_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_normalized_payloads_evidence_type_observed
  ON app_normalized_market_evidence_payloads (evidence_type_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_normalized_payloads_evidence_class_observed
  ON app_normalized_market_evidence_payloads (evidence_class, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_normalized_payloads_asset_observed
  ON app_normalized_market_evidence_payloads (asset, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_normalized_payloads_provider_normalized
  ON app_normalized_market_evidence_payloads (provider_id, normalized_at DESC);
CREATE INDEX IF NOT EXISTS idx_normalized_payloads_region_observed
  ON app_normalized_market_evidence_payloads (region, observed_at DESC);
