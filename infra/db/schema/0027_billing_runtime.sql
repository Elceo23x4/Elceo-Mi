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

-- Compatibility with 0005_billing_subscription_lifecycle.sql:
-- fresh databases already have app_billing_subscriptions from 0005 with
-- user_id/provider/status/plan_tier/current_period_*_utc/updated_at_utc.
-- CREATE TABLE IF NOT EXISTS above intentionally preserves that table, so
-- add the 0027 runtime columns before creating indexes that depend on them.
ALTER TABLE app_billing_subscriptions ADD COLUMN IF NOT EXISTS subscription_id TEXT;
ALTER TABLE app_billing_subscriptions ADD COLUMN IF NOT EXISTS subject_kind TEXT;
ALTER TABLE app_billing_subscriptions ADD COLUMN IF NOT EXISTS subject_id TEXT;
ALTER TABLE app_billing_subscriptions ADD COLUMN IF NOT EXISTS provider_kind TEXT;
ALTER TABLE app_billing_subscriptions ADD COLUMN IF NOT EXISTS plan_kind TEXT;
ALTER TABLE app_billing_subscriptions ADD COLUMN IF NOT EXISTS subscription_state TEXT;
ALTER TABLE app_billing_subscriptions ADD COLUMN IF NOT EXISTS interval TEXT;
ALTER TABLE app_billing_subscriptions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE app_billing_subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;
ALTER TABLE app_billing_subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE app_billing_subscriptions ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;
ALTER TABLE app_billing_subscriptions ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;
ALTER TABLE app_billing_subscriptions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE app_billing_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE app_billing_subscriptions
SET
  subscription_id = COALESCE(subscription_id, external_subscription_id, user_id::text),
  subject_kind = COALESCE(subject_kind, 'user'),
  subject_id = COALESCE(subject_id, user_id::text),
  provider_kind = COALESCE(provider_kind, provider),
  plan_kind = COALESCE(plan_kind, plan_tier),
  subscription_state = COALESCE(subscription_state, status),
  interval = COALESCE(interval, 'unknown'),
  current_period_start = COALESCE(current_period_start, current_period_start_utc),
  current_period_end = COALESCE(current_period_end, current_period_end_utc),
  updated_at = COALESCE(updated_at, updated_at_utc, now())
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_billing_subscriptions_runtime_id ON app_billing_subscriptions(subscription_id) WHERE subscription_id IS NOT NULL;
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
