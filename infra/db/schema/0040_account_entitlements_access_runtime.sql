CREATE TABLE IF NOT EXISTS app_account_entitlements (
  subject_kind text NOT NULL,
  subject_id text NOT NULL,
  plan_kind text NOT NULL,
  account_state text NOT NULL,
  plan_started_at timestamptz NULL,
  plan_ends_at timestamptz NULL,
  trial_ends_at timestamptz NULL,
  internal_override boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (subject_kind, subject_id)
);

CREATE TABLE IF NOT EXISTS app_usage_counters (
  counter_id text PRIMARY KEY,
  subject_kind text NOT NULL,
  subject_id text NOT NULL,
  counter_key text NOT NULL,
  period text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL,
  UNIQUE (subject_kind, subject_id, counter_key, period, period_start, period_end)
);

CREATE TABLE IF NOT EXISTS app_feature_access_decisions (
  decision_id text PRIMARY KEY,
  subject_kind text NOT NULL,
  subject_id text NOT NULL,
  feature text NOT NULL,
  plan_kind text NOT NULL,
  account_state text NOT NULL,
  access_level text NOT NULL,
  reason_code text NOT NULL,
  usage_counter_key text NULL,
  current_usage integer NULL,
  limit_max integer NULL,
  decided_at timestamptz NOT NULL,
  decision_json jsonb NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_account_entitlements_updated ON app_account_entitlements (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_counters_subject_updated ON app_usage_counters (subject_kind, subject_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_access_decisions_subject_decided ON app_feature_access_decisions (subject_kind, subject_id, decided_at DESC);
