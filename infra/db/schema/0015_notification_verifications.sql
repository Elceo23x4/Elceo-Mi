CREATE TABLE IF NOT EXISTS app_notification_verifications (
  verification_id TEXT PRIMARY KEY,
  verification_key TEXT NOT NULL UNIQUE,
  target_id TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  verification_kind TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  status TEXT NOT NULL,
  attempt_count INTEGER NOT NULL,
  last_attempt_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_verifications_target_status_expiry
  ON app_notification_verifications (target_id, status, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_verifications_subject_channel_created
  ON app_notification_verifications (subject_kind, subject_id, channel, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_verifications_kind_status_created
  ON app_notification_verifications (verification_kind, status, created_at DESC);
