CREATE TABLE IF NOT EXISTS payment_operations (
  internal_payment_operation_id TEXT PRIMARY KEY,
  business_idempotency_key TEXT NOT NULL,
  provider_idempotency_key TEXT NOT NULL UNIQUE,
  subject_user_id TEXT NOT NULL,
  target_plan TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  provider TEXT NOT NULL,
  state TEXT NOT NULL,
  provider_payment_reference TEXT NULL,
  provider_checkout_session_reference TEXT NULL,
  provider_event_references JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NULL,
  reconciliation_state TEXT NOT NULL,
  last_provider_comparison_snapshot JSONB NULL,
  safe_error_category TEXT NULL,
  UNIQUE (subject_user_id, business_idempotency_key)
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_operations_provider_payment_reference_uidx ON payment_operations(provider_payment_reference) WHERE provider_payment_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payment_operations_provider_checkout_session_reference_uidx ON payment_operations(provider_checkout_session_reference) WHERE provider_checkout_session_reference IS NOT NULL;
CREATE TABLE IF NOT EXISTS payment_provider_event_inbox (
  provider_event_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_kind TEXT NOT NULL,
  provider_payment_reference TEXT NULL,
  internal_payment_operation_id TEXT NULL REFERENCES payment_operations(internal_payment_operation_id),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS payment_ledger_effects (
  effect_key TEXT PRIMARY KEY,
  internal_payment_operation_id TEXT NOT NULL REFERENCES payment_operations(internal_payment_operation_id),
  effect_kind TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS payment_entitlement_effects (
  effect_key TEXT PRIMARY KEY,
  internal_payment_operation_id TEXT NOT NULL REFERENCES payment_operations(internal_payment_operation_id),
  subject_user_id TEXT NOT NULL,
  target_plan TEXT NOT NULL,
  effect_kind TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE IF NOT EXISTS payment_reconciliation_audit (
  audit_id TEXT PRIMARY KEY,
  internal_payment_operation_id TEXT NULL REFERENCES payment_operations(internal_payment_operation_id),
  message TEXT NOT NULL,
  audit_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL
);
