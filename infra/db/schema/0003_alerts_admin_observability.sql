-- Slice 5: alerts, audit, and admin observability

CREATE TABLE IF NOT EXISTS app_in_app_alerts (
  alert_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user_profiles(id) ON DELETE CASCADE,
  asset_code TEXT NOT NULL,
  alert_class TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  created_at_utc TIMESTAMPTZ NOT NULL,
  read_at_utc TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_app_in_app_alerts_user_created ON app_in_app_alerts(user_id, created_at_utc DESC);
CREATE INDEX IF NOT EXISTS idx_app_in_app_alerts_fingerprint ON app_in_app_alerts(user_id, fingerprint);

CREATE TABLE IF NOT EXISTS app_audit_logs (
  log_id UUID PRIMARY KEY,
  actor_user_id UUID REFERENCES app_user_profiles(id) ON DELETE SET NULL,
  scope TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at_utc TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_audit_logs_created ON app_audit_logs(created_at_utc DESC);
