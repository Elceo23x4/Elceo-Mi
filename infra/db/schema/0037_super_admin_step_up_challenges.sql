CREATE TABLE IF NOT EXISTS super_admin_step_up_challenges (
  challenge_id text PRIMARY KEY,
  actor_user_id text NOT NULL,
  target_user_id text,
  action_kind text NOT NULL,
  route_scope text NOT NULL,
  provider_kind text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  fresh_until timestamptz,
  failed_attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  lockout_until timestamptz,
  redaction_status text NOT NULL DEFAULT 'safe'
);

CREATE INDEX IF NOT EXISTS idx_super_admin_step_up_challenges_actor_status ON super_admin_step_up_challenges(actor_user_id, status);
CREATE INDEX IF NOT EXISTS idx_super_admin_step_up_challenges_expires_at ON super_admin_step_up_challenges(expires_at);
