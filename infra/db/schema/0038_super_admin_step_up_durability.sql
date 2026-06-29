-- RC-B2 durable super-admin step-up state.

ALTER TABLE IF EXISTS super_admin_step_up_challenges
  ADD COLUMN IF NOT EXISTS verified_provider_kind text NULL,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS version bigint NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_super_admin_step_up_challenges_actor_created
  ON super_admin_step_up_challenges(actor_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_super_admin_step_up_challenges_actor_lockout
  ON super_admin_step_up_challenges(actor_user_id, lockout_until);
CREATE INDEX IF NOT EXISTS idx_super_admin_step_up_challenges_status_fresh
  ON super_admin_step_up_challenges(status, fresh_until);
CREATE INDEX IF NOT EXISTS idx_super_admin_step_up_challenges_status_expires
  ON super_admin_step_up_challenges(status, expires_at);

DO $$ BEGIN
  ALTER TABLE super_admin_step_up_challenges ADD CONSTRAINT super_admin_step_up_challenges_failed_attempts_nonnegative CHECK (failed_attempts >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE super_admin_step_up_challenges ADD CONSTRAINT super_admin_step_up_challenges_version_nonnegative CHECK (version >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE super_admin_step_up_challenges ADD CONSTRAINT super_admin_step_up_challenges_status_known CHECK (status IN ('pending','verified','expired','replayed','locked','consumed')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE super_admin_step_up_challenges ADD CONSTRAINT super_admin_step_up_challenges_provider_known CHECK (provider_kind IN ('totp','webauthn_passkey','authenticator_app','verified_email_fallback','fixture_test_only') AND (verified_provider_kind IS NULL OR verified_provider_kind IN ('totp','webauthn_passkey','authenticator_app','verified_email_fallback','fixture_test_only'))) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE super_admin_step_up_challenges ADD CONSTRAINT super_admin_step_up_challenges_action_known CHECK (action_kind IN ('focus_plan_gift','focus_plan_gift_retract','user_restriction')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE super_admin_step_up_challenges ADD CONSTRAINT super_admin_step_up_challenges_redaction_safe CHECK (redaction_status = 'safe') NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE super_admin_step_up_challenges ADD CONSTRAINT super_admin_step_up_challenges_state_invariants CHECK (
    (status <> 'pending' OR (consumed_at IS NULL AND verified_at IS NULL AND fresh_until IS NULL AND verified_provider_kind IS NULL)) AND
    (status <> 'verified' OR (verified_at IS NOT NULL AND fresh_until IS NOT NULL AND verified_provider_kind IS NOT NULL AND consumed_at IS NULL)) AND
    (status <> 'consumed' OR (verified_at IS NOT NULL AND verified_provider_kind IS NOT NULL AND consumed_at IS NOT NULL AND fresh_until IS NULL)) AND
    (status <> 'locked' OR lockout_until IS NOT NULL)
  ) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS super_admin_step_up_actor_state (
  actor_user_id text PRIMARY KEY,
  lockout_until timestamptz NULL,
  updated_at timestamptz NOT NULL,
  version bigint NOT NULL DEFAULT 0,
  CONSTRAINT super_admin_step_up_actor_state_version_nonnegative CHECK (version >= 0)
);

CREATE TABLE IF NOT EXISTS super_admin_step_up_audit_events (
  audit_event_id text PRIMARY KEY,
  challenge_id text NULL,
  actor_user_id text NOT NULL,
  target_user_id text NULL,
  action_kind text NOT NULL,
  route_scope text NOT NULL,
  provider_kind text NULL,
  event_kind text NOT NULL,
  outcome_status text NOT NULL,
  failure_reason text NULL,
  attempt_number integer NULL,
  redaction_status text NOT NULL DEFAULT 'safe',
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT super_admin_step_up_audit_redaction_safe CHECK (redaction_status = 'safe'),
  CONSTRAINT super_admin_step_up_audit_event_known CHECK (event_kind IN ('challenge_created','challenge_creation_blocked','verification_succeeded','verification_failed','verification_provider_pending','verification_replayed','challenge_expired','actor_locked','challenge_consumed','consumption_denied','persistence_failure')),
  CONSTRAINT super_admin_step_up_audit_action_known CHECK (action_kind IN ('focus_plan_gift','focus_plan_gift_retract','user_restriction')),
  CONSTRAINT super_admin_step_up_audit_provider_known CHECK (provider_kind IS NULL OR provider_kind IN ('totp','webauthn_passkey','authenticator_app','verified_email_fallback','fixture_test_only'))
);

CREATE INDEX IF NOT EXISTS idx_super_admin_step_up_audit_challenge
  ON super_admin_step_up_audit_events(challenge_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_super_admin_step_up_audit_actor
  ON super_admin_step_up_audit_events(actor_user_id, occurred_at);
