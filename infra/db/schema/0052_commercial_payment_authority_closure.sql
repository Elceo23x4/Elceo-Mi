ALTER TABLE payment_operations ADD COLUMN IF NOT EXISTS billing_interval TEXT;
ALTER TABLE payment_operations ADD COLUMN IF NOT EXISTS provider_customer_reference TEXT;
ALTER TABLE payment_operations ADD COLUMN IF NOT EXISTS provider_subscription_reference TEXT;
ALTER TABLE payment_operations ADD COLUMN IF NOT EXISTS subscription_state TEXT;
ALTER TABLE payment_operations ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ;
ALTER TABLE payment_operations ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;
ALTER TABLE payment_operations ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE payment_operations DROP CONSTRAINT IF EXISTS payment_operations_billing_interval_check;
ALTER TABLE payment_operations ADD CONSTRAINT payment_operations_billing_interval_check CHECK (billing_interval IN ('monthly','quarterly','yearly'));
CREATE INDEX IF NOT EXISTS payment_operations_provider_customer_idx ON payment_operations(provider_customer_reference) WHERE provider_customer_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payment_operations_provider_subscription_uidx ON payment_operations(provider_subscription_reference) WHERE provider_subscription_reference IS NOT NULL;

-- Canonicalize every historical legacy row once. Historical premium is the
-- predecessor of Focus Plan; runtime code never accepts premium as product truth.
UPDATE app_billing_subscriptions SET
  subscription_id=COALESCE(subscription_id,external_subscription_id,user_id::text),
  subject_kind=COALESCE(subject_kind,'user'),
  subject_id=COALESCE(subject_id,user_id::text),
  provider_kind=COALESCE(provider_kind,provider,'internal'),
  plan_kind=CASE WHEN COALESCE(plan_kind,plan_tier)='premium' THEN 'focus_plan' ELSE COALESCE(plan_kind,'kick_off') END,
  subscription_state=COALESCE(subscription_state,status,'inactive'),
  interval=COALESCE(interval,'monthly'),
  updated_at=COALESCE(updated_at,updated_at_utc,NOW())
WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS app_billing_subscriptions_canonical_subject_uidx
  ON app_billing_subscriptions(subject_kind,subject_id) WHERE subject_kind IS NOT NULL AND subject_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payment_operations_one_unresolved_intention_uidx
  ON payment_operations(subject_user_id,target_plan,billing_interval)
  WHERE state IN ('created','pending_provider','processing','unknown','reconciliation_required');
