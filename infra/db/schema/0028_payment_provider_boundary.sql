CREATE TABLE IF NOT EXISTS app_billing_external_customers (
  external_customer_id TEXT PRIMARY KEY,
  provider_kind TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  email TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_abec_subject ON app_billing_external_customers(provider_kind, subject_kind, subject_id);
CREATE INDEX IF NOT EXISTS idx_abec_email ON app_billing_external_customers(email);

CREATE TABLE IF NOT EXISTS app_billing_external_subscriptions (
  external_subscription_id TEXT PRIMARY KEY,
  external_customer_id TEXT NOT NULL,
  provider_kind TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  external_price_id TEXT NULL,
  external_product_id TEXT NULL,
  mapped_plan_kind TEXT NULL,
  provider_status TEXT NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  current_period_start TIMESTAMPTZ NULL,
  current_period_end TIMESTAMPTZ NULL,
  trial_starts_at TIMESTAMPTZ NULL,
  trial_ends_at TIMESTAMPTZ NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_abes_subject ON app_billing_external_subscriptions(provider_kind, subject_kind, subject_id);
CREATE INDEX IF NOT EXISTS idx_abes_customer ON app_billing_external_subscriptions(external_customer_id);
CREATE INDEX IF NOT EXISTS idx_abes_plan_updated ON app_billing_external_subscriptions(mapped_plan_kind, updated_at DESC);

CREATE TABLE IF NOT EXISTS app_billing_external_events (
  external_event_id TEXT NOT NULL,
  provider_kind TEXT NOT NULL,
  kind TEXT NOT NULL,
  external_customer_id TEXT NULL,
  external_subscription_id TEXT NULL,
  subject_kind TEXT NULL,
  subject_id TEXT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  payload_json JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processing_result_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (provider_kind, external_event_id)
);
CREATE INDEX IF NOT EXISTS idx_abee_processed ON app_billing_external_events(processed, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_abee_provider_occurred ON app_billing_external_events(provider_kind, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_abee_subject_occurred ON app_billing_external_events(subject_kind, subject_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_abee_subscription_occurred ON app_billing_external_events(external_subscription_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS app_billing_provider_plan_mappings (
  provider_kind TEXT NOT NULL,
  external_price_id TEXT NOT NULL,
  mapped_plan_kind TEXT NOT NULL,
  interval TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (provider_kind, external_price_id)
);
