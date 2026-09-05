-- SEC-B: forward-only password credential closure.
-- Every verifier created before this migration is treated as compromised.
ALTER TABLE app_auth_credentials ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE app_auth_credentials
  ADD COLUMN IF NOT EXISTS credential_state TEXT NOT NULL DEFAULT 'reset_required',
  ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMPTZ;

UPDATE app_auth_credentials
SET password_hash = NULL,
    credential_state = 'reset_required',
    password_updated_at = NULL,
    updated_at = now();

ALTER TABLE app_auth_credentials DROP CONSTRAINT IF EXISTS app_auth_credentials_state_check;
ALTER TABLE app_auth_credentials ADD CONSTRAINT app_auth_credentials_state_check CHECK (
  (credential_state = 'reset_required' AND password_hash IS NULL)
  OR
  (credential_state = 'active' AND password_hash LIKE '$argon2id$v=%$m=%$%$%' AND password_updated_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS app_password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user_profiles(id) ON DELETE CASCADE,
  token_digest BYTEA NOT NULL UNIQUE CHECK (octet_length(token_digest) = 32),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at),
  CHECK (consumed_at IS NULL OR consumed_at >= created_at)
);

CREATE INDEX IF NOT EXISTS idx_app_password_reset_tokens_lookup
  ON app_password_reset_tokens (token_digest, expires_at) WHERE consumed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_app_password_reset_tokens_user_open
  ON app_password_reset_tokens (user_id) WHERE consumed_at IS NULL;
