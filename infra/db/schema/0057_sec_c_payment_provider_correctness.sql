-- SEC-C: money is stored as an exact integer in the currency's provider minor unit.
CREATE TABLE commercial_price_versions (
  commercial_price_version_id UUID PRIMARY KEY,
  plan_code TEXT NOT NULL,
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly','quarterly','yearly')),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z0-9]{3,12}$'),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  status TEXT NOT NULL CHECK (status IN ('active','superseded')),
  effective_from TIMESTAMPTZ NOT NULL,
  retired_at TIMESTAMPTZ,
  actor_super_admin_id UUID NOT NULL,
  reason_code TEXT NOT NULL,
  operator_note TEXT NOT NULL,
  version INTEGER NOT NULL CHECK (version > 0),
  mutation_idempotency_key TEXT NOT NULL,
  mutation_payload_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_code,billing_interval,currency,version),
  UNIQUE(actor_super_admin_id,mutation_idempotency_key)
);
CREATE UNIQUE INDEX commercial_price_one_active_idx ON commercial_price_versions(plan_code,billing_interval,currency) WHERE status='active';

CREATE TABLE payment_provider_capabilities (
  provider TEXT NOT NULL CHECK (provider IN ('stripe','korapay')),
  environment TEXT NOT NULL CHECK (environment IN ('sandbox','production')),
  rail TEXT NOT NULL,
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z0-9]{3,12}$'),
  merchant_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  checkout_supported BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_supported BOOLEAN NOT NULL DEFAULT FALSE,
  reconciliation_supported BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ NOT NULL,
  verification_source TEXT NOT NULL,
  PRIMARY KEY(provider,environment,rail,currency)
);

ALTER TABLE payment_operations ADD COLUMN commercial_price_version_id UUID REFERENCES commercial_price_versions(commercial_price_version_id);
ALTER TABLE payment_operations ADD COLUMN quoted_plan TEXT;
ALTER TABLE payment_operations ADD COLUMN quoted_amount_minor BIGINT;
ALTER TABLE payment_operations ADD COLUMN quoted_currency TEXT;
ALTER TABLE payment_operations ADD COLUMN quoted_provider_product_reference TEXT;
ALTER TABLE payment_operations ADD COLUMN provider_transaction_reference TEXT;
CREATE UNIQUE INDEX payment_operations_provider_transaction_uidx ON payment_operations(provider_transaction_reference) WHERE provider_transaction_reference IS NOT NULL;

-- Locking happens before every event transition; the trigger is a final guard
-- against accidentally mutating immutable price history.
CREATE OR REPLACE FUNCTION reject_commercial_price_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF TG_OP='UPDATE' AND OLD.status='active' AND NEW.status='superseded' AND NEW.retired_at IS NOT NULL AND (to_jsonb(NEW)-'status'-'retired_at')=(to_jsonb(OLD)-'status'-'retired_at') THEN RETURN NEW; END IF; RAISE EXCEPTION 'commercial_price_versions_are_immutable'; END $$;
CREATE TRIGGER commercial_price_versions_immutable BEFORE UPDATE OR DELETE ON commercial_price_versions FOR EACH ROW EXECUTE FUNCTION reject_commercial_price_update();
