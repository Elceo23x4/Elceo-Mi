CREATE TABLE IF NOT EXISTS app_expectation_records (
  expectation_id text PRIMARY KEY,
  asset text NOT NULL,
  timeframe text NOT NULL,
  issued_at timestamptz NOT NULL,
  data_cutoff_at timestamptz NOT NULL CHECK (data_cutoff_at <= issued_at),
  reasoning_run_id text NOT NULL REFERENCES app_reasoning_runs(reasoning_run_id) ON DELETE RESTRICT,
  cognition_snapshot_id text NOT NULL UNIQUE REFERENCES app_cognition_snapshots(snapshot_id) ON DELETE RESTRICT,
  reasoning_version text NOT NULL,
  scoring_version text NOT NULL,
  base_price numeric NOT NULL,
  recent_range_pct numeric,
  expected_bias text NOT NULL,
  confidence_score numeric NOT NULL,
  contradiction_score numeric NOT NULL,
  contradiction_regime text NOT NULL,
  payload_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_expectation_records_asset_timeframe_issued_idx ON app_expectation_records(asset, timeframe, issued_at DESC);

CREATE TABLE IF NOT EXISTS app_expectation_reality_evaluations (
  evaluation_id text PRIMARY KEY,
  expectation_id text NOT NULL REFERENCES app_expectation_records(expectation_id) ON DELETE RESTRICT,
  asset text NOT NULL,
  timeframe text NOT NULL,
  horizon text NOT NULL,
  observation_version text NOT NULL,
  evaluated_at timestamptz NOT NULL,
  policy_version text NOT NULL,
  outcome text NOT NULL,
  path_classification text NOT NULL,
  audit_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (expectation_id, horizon, observation_version)
);
CREATE INDEX IF NOT EXISTS app_expectation_reality_asset_timeframe_outcome_idx ON app_expectation_reality_evaluations(asset, timeframe, outcome, evaluated_at DESC);
