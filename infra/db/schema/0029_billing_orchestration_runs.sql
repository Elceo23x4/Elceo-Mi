CREATE TABLE IF NOT EXISTS app_billing_orchestration_runs (
  run_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  provider_kind TEXT NOT NULL,
  retry_plan_json JSONB NOT NULL,
  status TEXT NOT NULL,
  changed_lifecycle BOOLEAN NOT NULL,
  changed_policy BOOLEAN NOT NULL,
  changed_entitlement BOOLEAN NOT NULL,
  latest_reconciliation_run_id TEXT NULL,
  latest_policy_transition_id TEXT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  run_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS app_billing_orchestration_runs_subject_idx
  ON app_billing_orchestration_runs(subject_kind,subject_id,created_at DESC);
CREATE INDEX IF NOT EXISTS app_billing_orchestration_runs_provider_idx
  ON app_billing_orchestration_runs(provider_kind,created_at DESC);
CREATE INDEX IF NOT EXISTS app_billing_orchestration_runs_status_idx
  ON app_billing_orchestration_runs(status,created_at DESC);
