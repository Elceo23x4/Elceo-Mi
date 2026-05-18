CREATE TABLE IF NOT EXISTS super_admin_focus_plan_gifts (
  gift_id text PRIMARY KEY,
  target_user_id text NOT NULL,
  actor_user_id text NOT NULL,
  status text NOT NULL,
  duration text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  retracted_at timestamptz,
  retracted_by text,
  operator_note text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_super_admin_focus_plan_gifts_target ON super_admin_focus_plan_gifts(target_user_id);

CREATE TABLE IF NOT EXISTS super_admin_user_restrictions (
  restriction_id text PRIMARY KEY,
  target_user_id text NOT NULL,
  actor_user_id text NOT NULL,
  restriction_kind text NOT NULL,
  status text NOT NULL,
  reason text NOT NULL,
  operator_note text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_super_admin_user_restrictions_target ON super_admin_user_restrictions(target_user_id);
