CREATE TABLE IF NOT EXISTS app_security_idempotency_responses (
  idempotency_key TEXT PRIMARY KEY,
  action_kind TEXT NOT NULL,
  actor_kind TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response_hash TEXT NOT NULL,
  http_status INTEGER NOT NULL,
  response_json JSONB NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  metadata_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_security_idempotency_responses_actor_action_completed
  ON app_security_idempotency_responses (actor_kind, actor_id, action_kind, completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_security_idempotency_responses_expires_at
  ON app_security_idempotency_responses (expires_at);
