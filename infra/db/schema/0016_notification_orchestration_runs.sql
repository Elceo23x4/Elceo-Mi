CREATE TABLE IF NOT EXISTS app_notification_orchestration_runs (
  orchestration_run_id TEXT PRIMARY KEY,
  stage TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,
  status TEXT NOT NULL,
  reasoning_run_id TEXT NULL,
  policy_evaluation_id TEXT NULL,
  evaluated_decision_count INTEGER NOT NULL,
  notifying_decision_count INTEGER NOT NULL,
  staged_outbox_count INTEGER NOT NULL,
  dispatched_outbox_count INTEGER NOT NULL,
  delivered_count INTEGER NOT NULL,
  failed_count INTEGER NOT NULL,
  dead_count INTEGER NOT NULL,
  expired_verification_count INTEGER NOT NULL,
  failure_reason TEXT NULL,
  warnings_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  report_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_orchestration_stage_created
  ON app_notification_orchestration_runs (stage, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_orchestration_reasoning_run
  ON app_notification_orchestration_runs (reasoning_run_id);

CREATE INDEX IF NOT EXISTS idx_notification_orchestration_status_created
  ON app_notification_orchestration_runs (status, created_at DESC);
