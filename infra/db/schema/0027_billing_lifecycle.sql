CREATE TABLE IF NOT EXISTS app_billing_customers (
  customer_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  provider_kind TEXT NOT NULL,
  provider_customer_id TEXT NOT NULL,
  state TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_customers_subject_provider ON app_billing_customers(subject_kind, subject_id, provider_kind);
CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_customers_provider_customer ON app_billing_customers(provider_kind, provider_customer_id);

CREATE TABLE IF NOT EXISTS app_billing_subscriptions_lifecycle (
  subscription_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  provider_kind TEXT NOT NULL,
  provider_subscription_id TEXT NOT NULL,
  provider_price_id TEXT,
  provider_product_id TEXT,
  provider_plan_code TEXT,
  canonical_plan_kind TEXT NOT NULL,
  plan_source TEXT NOT NULL,
  state TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  will_cancel_at_period_end BOOLEAN NOT NULL,
  latest_provider_event_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_subscriptions_subject_provider ON app_billing_subscriptions_lifecycle(subject_kind, subject_id, provider_kind);
CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_subscriptions_provider_subscription ON app_billing_subscriptions_lifecycle(provider_kind, provider_subscription_id);

CREATE TABLE IF NOT EXISTS app_billing_reconciliation_runs (
  run_id TEXT PRIMARY KEY,
  provider_kind TEXT NOT NULL,
  source_event_id TEXT,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  customer_changed BOOLEAN NOT NULL,
  subscription_changed BOOLEAN NOT NULL,
  entitlement_changed BOOLEAN NOT NULL,
  previous_plan_kind TEXT,
  next_plan_kind TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  run_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_recon_runs_subject_created ON app_billing_reconciliation_runs(subject_kind,subject_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_recon_runs_provider_created ON app_billing_reconciliation_runs(provider_kind,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_recon_runs_status_created ON app_billing_reconciliation_runs(status,created_at DESC);
