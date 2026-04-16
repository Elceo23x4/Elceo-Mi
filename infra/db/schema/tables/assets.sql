<<<<<<< HEAD
CREATE TABLE IF NOT EXISTS app_watchlists (
  user_id UUID PRIMARY KEY REFERENCES app_user_profiles(id) ON DELETE CASCADE,
  assets JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
=======
-- table boundary placeholder
>>>>>>> origin/main
