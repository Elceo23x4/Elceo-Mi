CREATE TABLE IF NOT EXISTS app_billing_subscriptions (
  subscription_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  provider_kind TEXT NOT NULL,
  external_subscription_id TEXT,
  plan_kind TEXT NOT NULL,
  subscription_state TEXT NOT NULL,
  interval TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL,
  canceled_at TIMESTAMPTZ,
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_subject_updated ON app_billing_subscriptions (subject_kind, subject_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_state_updated ON app_billing_subscriptions (subscription_state, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_plan_updated ON app_billing_subscriptions (plan_kind, updated_at DESC);

CREATE TABLE IF NOT EXISTS app_billing_events (
  event_id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  provider_kind TEXT NOT NULL,
  external_event_id TEXT,
  occurred_at TIMESTAMPTZ NOT NULL,
  event_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_billing_events_subscription_occurred ON app_billing_events (subscription_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_subject_occurred ON app_billing_events (subject_kind, subject_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_kind_occurred ON app_billing_events (kind, occurred_at DESC);
