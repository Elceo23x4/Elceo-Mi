-- Slice 7: billing lifecycle and entitlement hardening

CREATE TABLE IF NOT EXISTS app_billing_subscriptions (
  user_id UUID PRIMARY KEY REFERENCES app_user_profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'mock',
  status TEXT NOT NULL DEFAULT 'inactive',
  plan_tier TEXT NOT NULL DEFAULT 'free',
  external_customer_id TEXT,
  external_subscription_id TEXT,
  current_period_start_utc TIMESTAMPTZ,
  current_period_end_utc TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  last_webhook_event_id TEXT,
  updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_subscription_status ON app_billing_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_billing_subscription_plan ON app_billing_subscriptions(plan_tier);
