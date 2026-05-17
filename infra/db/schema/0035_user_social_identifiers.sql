CREATE TABLE IF NOT EXISTS app_user_social_identifiers (
  user_id text PRIMARY KEY,
  linkedin_address text NULL,
  telegram_id text NULL,
  x_username text NULL,
  readiness_status text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS app_user_social_identifiers_updated_at_idx ON app_user_social_identifiers (updated_at DESC);
