CREATE TABLE IF NOT EXISTS app_billing_policy_transitions (
  transition_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  provider_kind TEXT NOT NULL,
  billing_subscription_id TEXT NULL,
  previous_plan_kind TEXT NULL,
  next_plan_kind TEXT NOT NULL,
  previous_account_state TEXT NULL,
  next_account_state TEXT NOT NULL,
  decision_code TEXT NOT NULL,
  severity TEXT NOT NULL,
  restricted_access BOOLEAN NOT NULL,
  recovered_access BOOLEAN NOT NULL,
  source_reconciliation_run_id TEXT NULL,
  rationale TEXT NOT NULL,
  decided_at TIMESTAMPTZ NOT NULL,
  transition_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_app_billing_policy_transitions_subject ON app_billing_policy_transitions (subject_kind, subject_id, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_billing_policy_transitions_provider ON app_billing_policy_transitions (provider_kind, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_billing_policy_transitions_decision ON app_billing_policy_transitions (decision_code, decided_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_billing_policy_transitions_severity ON app_billing_policy_transitions (severity, decided_at DESC);
