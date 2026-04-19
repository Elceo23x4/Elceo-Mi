-- Slice 2: auth/session and application state

CREATE TABLE IF NOT EXISTS app_user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  plan_tier TEXT NOT NULL DEFAULT 'free',
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  disclaimer_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  motion_intensity TEXT NOT NULL DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_auth_credentials (
  user_id UUID PRIMARY KEY REFERENCES app_user_profiles(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_watchlists (
  user_id UUID PRIMARY KEY REFERENCES app_user_profiles(id) ON DELETE CASCADE,
  assets JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_notification_settings (
  user_id UUID PRIMARY KEY REFERENCES app_user_profiles(id) ON DELETE CASCADE,
  in_app BOOLEAN NOT NULL DEFAULT TRUE,
  email BOOLEAN NOT NULL DEFAULT TRUE,
  browser_push BOOLEAN NOT NULL DEFAULT FALSE,
  bias_changes BOOLEAN NOT NULL DEFAULT TRUE,
  contradiction_spikes BOOLEAN NOT NULL DEFAULT TRUE,
  key_level_interactions BOOLEAN NOT NULL DEFAULT TRUE,
  macro_event_warnings BOOLEAN NOT NULL DEFAULT TRUE,
  post_event_regime_shift BOOLEAN NOT NULL DEFAULT TRUE,
  journal_coaching BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_sessions (
  session_token TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_user_profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_user_profiles_role ON app_user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_app_user_profiles_plan_tier ON app_user_profiles(plan_tier);
