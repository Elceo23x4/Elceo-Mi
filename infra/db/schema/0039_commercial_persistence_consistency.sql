ALTER TABLE super_admin_focus_plan_gifts ADD COLUMN IF NOT EXISTS plan_code text;
ALTER TABLE super_admin_focus_plan_gifts ADD COLUMN IF NOT EXISTS reason_code text;
ALTER TABLE super_admin_focus_plan_gifts ADD COLUMN IF NOT EXISTS step_up_challenge_id text;
ALTER TABLE super_admin_focus_plan_gifts ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE super_admin_focus_plan_gifts ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
ALTER TABLE super_admin_focus_plan_gifts ADD COLUMN IF NOT EXISTS retraction_reason_code text;
ALTER TABLE super_admin_focus_plan_gifts ADD COLUMN IF NOT EXISTS retraction_operator_note text;
ALTER TABLE super_admin_focus_plan_gifts ADD COLUMN IF NOT EXISTS retraction_step_up_challenge_id text;
ALTER TABLE super_admin_focus_plan_gifts ADD COLUMN IF NOT EXISTS retraction_idempotency_key text;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_safpg_status') THEN ALTER TABLE super_admin_focus_plan_gifts ADD CONSTRAINT chk_safpg_status CHECK (status IN ('active','expired','retracted')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_safpg_duration') THEN ALTER TABLE super_admin_focus_plan_gifts ADD CONSTRAINT chk_safpg_duration CHECK (duration IN ('two_weeks','one_month')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_safpg_plan_code') THEN ALTER TABLE super_admin_focus_plan_gifts ADD CONSTRAINT chk_safpg_plan_code CHECK (plan_code IS NULL OR plan_code = 'focus_plan'); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_safpg_reason') THEN ALTER TABLE super_admin_focus_plan_gifts ADD CONSTRAINT chk_safpg_reason CHECK (reason_code IS NULL OR reason_code IN ('commercial_support','abuse_prevention','fraud_risk','security_risk','policy_violation','operator_correction')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_safpg_retraction_reason') THEN ALTER TABLE super_admin_focus_plan_gifts ADD CONSTRAINT chk_safpg_retraction_reason CHECK (retraction_reason_code IS NULL OR retraction_reason_code IN ('commercial_support','abuse_prevention','fraud_risk','security_risk','policy_violation','operator_correction')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_safpg_version') THEN ALTER TABLE super_admin_focus_plan_gifts ADD CONSTRAINT chk_safpg_version CHECK (version >= 0); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_safpg_retracted_consistency') THEN ALTER TABLE super_admin_focus_plan_gifts ADD CONSTRAINT chk_safpg_retracted_consistency CHECK ((status <> 'retracted') OR (retracted_at IS NOT NULL AND retracted_by IS NOT NULL)); END IF; END $$;

CREATE INDEX IF NOT EXISTS idx_safpg_target_status ON super_admin_focus_plan_gifts(target_user_id, status);
CREATE INDEX IF NOT EXISTS idx_safpg_target_ends_at ON super_admin_focus_plan_gifts(target_user_id, ends_at);
CREATE INDEX IF NOT EXISTS idx_safpg_idempotency ON super_admin_focus_plan_gifts(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_safpg_step_up ON super_admin_focus_plan_gifts(step_up_challenge_id);

ALTER TABLE super_admin_user_restrictions ADD COLUMN IF NOT EXISTS step_up_challenge_id text;
ALTER TABLE super_admin_user_restrictions ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE super_admin_user_restrictions ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_saur_kind') THEN ALTER TABLE super_admin_user_restrictions ADD CONSTRAINT chk_saur_kind CHECK (restriction_kind IN ('suspended','banned')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_saur_status') THEN ALTER TABLE super_admin_user_restrictions ADD CONSTRAINT chk_saur_status CHECK (status IN ('active','lifted')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_saur_reason') THEN ALTER TABLE super_admin_user_restrictions ADD CONSTRAINT chk_saur_reason CHECK (reason IN ('commercial_support','abuse_prevention','fraud_risk','security_risk','policy_violation','operator_correction')); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_saur_version') THEN ALTER TABLE super_admin_user_restrictions ADD CONSTRAINT chk_saur_version CHECK (version >= 0); END IF; END $$;
CREATE INDEX IF NOT EXISTS idx_saur_target_status ON super_admin_user_restrictions(target_user_id, status);
CREATE INDEX IF NOT EXISTS idx_saur_idempotency ON super_admin_user_restrictions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_saur_step_up ON super_admin_user_restrictions(step_up_challenge_id);

CREATE TABLE IF NOT EXISTS super_admin_commercial_target_state (
  target_user_id text PRIMARY KEY,
  updated_at timestamptz NOT NULL,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0)
);

CREATE TABLE IF NOT EXISTS super_admin_commercial_operations (
  operation_id text PRIMARY KEY,
  action_kind text NOT NULL CHECK (action_kind IN ('focus_plan_gift','focus_plan_gift_retract','user_restriction')),
  actor_user_id text NOT NULL,
  target_user_id text NOT NULL,
  step_up_challenge_id text NOT NULL,
  idempotency_key text,
  request_hash text NOT NULL,
  reason_code text NOT NULL,
  operator_note text NOT NULL,
  requested_resource_id text,
  operation_status text NOT NULL CHECK (operation_status IN ('pending','completed','business_denied')),
  failure_reason text,
  gift_id text,
  restriction_id text,
  resulting_entitlement_state text NOT NULL CHECK (resulting_entitlement_state IN ('focus_plan_active','subscription_required','restricted')),
  response_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  completed_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0)
);

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_saco_actor_nonempty') THEN ALTER TABLE super_admin_commercial_operations ADD CONSTRAINT chk_saco_actor_nonempty CHECK (length(trim(actor_user_id)) > 0); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_saco_target_nonempty') THEN ALTER TABLE super_admin_commercial_operations ADD CONSTRAINT chk_saco_target_nonempty CHECK (length(trim(target_user_id)) > 0); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_saco_stepup_nonempty') THEN ALTER TABLE super_admin_commercial_operations ADD CONSTRAINT chk_saco_stepup_nonempty CHECK (length(trim(step_up_challenge_id)) > 0); END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_saco_hash_nonempty') THEN ALTER TABLE super_admin_commercial_operations ADD CONSTRAINT chk_saco_hash_nonempty CHECK (length(trim(request_hash)) > 0); END IF; END $$;

CREATE TABLE IF NOT EXISTS super_admin_commercial_operation_events (
  event_id text PRIMARY KEY,
  operation_id text,
  actor_user_id text NOT NULL CHECK (length(trim(actor_user_id)) > 0),
  target_user_id text NOT NULL CHECK (length(trim(target_user_id)) > 0),
  action_kind text NOT NULL CHECK (action_kind IN ('focus_plan_gift','focus_plan_gift_retract','user_restriction')),
  idempotency_key text,
  request_hash text NOT NULL CHECK (length(trim(request_hash)) > 0),
  step_up_challenge_id text NOT NULL CHECK (length(trim(step_up_challenge_id)) > 0),
  event_kind text NOT NULL,
  outcome text NOT NULL,
  failure_reason text,
  reason_code text NOT NULL,
  operator_note text NOT NULL,
  requested_resource_id text,
  resulting_resource_id text,
  occurred_at timestamptz NOT NULL,
  redaction_status text NOT NULL CHECK (redaction_status = 'safe')
);
CREATE INDEX IF NOT EXISTS idx_sacoe_operation ON super_admin_commercial_operation_events(operation_id);
CREATE INDEX IF NOT EXISTS idx_sacoe_idempotency ON super_admin_commercial_operation_events(actor_user_id, action_kind, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_sacoe_target ON super_admin_commercial_operation_events(target_user_id, occurred_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_saco_idempotency_unique ON super_admin_commercial_operations(actor_user_id, action_kind, idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_saco_target ON super_admin_commercial_operations(target_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_saco_step_up ON super_admin_commercial_operations(step_up_challenge_id);
