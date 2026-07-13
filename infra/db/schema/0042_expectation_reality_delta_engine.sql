CREATE TABLE IF NOT EXISTS app_expectation_records (
  expectation_id text PRIMARY KEY,
  expectation_kind text NOT NULL DEFAULT 'cognition_path',
  event_release_id text,
  event_kind text,
  scheduled_release_time timestamptz,
  asset text NOT NULL,
  timeframe text,
  issued_at timestamptz NOT NULL,
  data_cutoff_at timestamptz NOT NULL CHECK (data_cutoff_at <= issued_at),
  reasoning_run_id text REFERENCES app_reasoning_runs(reasoning_run_id) ON DELETE RESTRICT,
  cognition_snapshot_id text REFERENCES app_cognition_snapshots(snapshot_id) ON DELETE RESTRICT,
  reasoning_version text,
  scoring_version text,
  base_price numeric,
  recent_range_pct numeric,
  expected_bias text,
  confidence_score numeric,
  contradiction_score numeric,
  contradiction_regime text,
  payload_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_expectation_records_asset_timeframe_issued_idx ON app_expectation_records(asset, timeframe, issued_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS app_expectation_records_cognition_path_snapshot_uidx ON app_expectation_records(cognition_snapshot_id) WHERE expectation_kind = 'cognition_path' AND cognition_snapshot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS app_expectation_records_event_release_idx ON app_expectation_records(event_release_id, scheduled_release_time DESC) WHERE expectation_kind = 'event';
CREATE UNIQUE INDEX IF NOT EXISTS app_expectation_records_event_release_expectation_idx ON app_expectation_records(event_release_id, expectation_id) WHERE expectation_kind = 'event';

CREATE TABLE IF NOT EXISTS app_expectation_reality_evaluations (
  evaluation_id text PRIMARY KEY,
  expectation_id text NOT NULL REFERENCES app_expectation_records(expectation_id) ON DELETE RESTRICT,
  asset text NOT NULL,
  timeframe text NOT NULL,
  horizon text NOT NULL,
  observation_version text NOT NULL,
  observation_content_hash text NOT NULL,
  evaluated_at timestamptz NOT NULL,
  policy_version text NOT NULL,
  outcome text NOT NULL,
  path_classification text NOT NULL,
  audit_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (expectation_id, horizon, observation_version),
  UNIQUE (expectation_id, observation_version, observation_content_hash)
);
CREATE INDEX IF NOT EXISTS app_expectation_reality_asset_timeframe_outcome_idx ON app_expectation_reality_evaluations(asset, timeframe, outcome, evaluated_at DESC);

CREATE TABLE IF NOT EXISTS app_event_reality_evaluations (
  event_evaluation_id text PRIMARY KEY,
  expectation_id text NOT NULL REFERENCES app_expectation_records(expectation_id) ON DELETE RESTRICT,
  release_id text NOT NULL,
  release_version text NOT NULL,
  asset text NOT NULL,
  interpreted_at timestamptz NOT NULL,
  primary_event_outcome text NOT NULL,
  pre_event_cognition_snapshot_id text REFERENCES app_cognition_snapshots(snapshot_id) ON DELETE RESTRICT,
  post_event_cognition_snapshot_id text REFERENCES app_cognition_snapshots(snapshot_id) ON DELETE RESTRICT,
  observation_content_hash text,
  reaction_provenance_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  audit_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (expectation_id, release_version)
);
CREATE INDEX IF NOT EXISTS app_event_reality_release_outcome_idx ON app_event_reality_evaluations(release_id, release_version, primary_event_outcome, interpreted_at DESC);
