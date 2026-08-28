ALTER TABLE payment_operations ADD COLUMN IF NOT EXISTS billing_interval TEXT;
ALTER TABLE payment_operations ADD COLUMN IF NOT EXISTS provider_customer_reference TEXT;
ALTER TABLE payment_operations ADD COLUMN IF NOT EXISTS provider_subscription_reference TEXT;
ALTER TABLE payment_operations DROP CONSTRAINT IF EXISTS payment_operations_billing_interval_check;
ALTER TABLE payment_operations ADD CONSTRAINT payment_operations_billing_interval_check CHECK (billing_interval IN ('monthly','quarterly','yearly'));
CREATE INDEX IF NOT EXISTS payment_operations_provider_customer_idx ON payment_operations(provider_customer_reference) WHERE provider_customer_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS payment_operations_provider_subscription_uidx ON payment_operations(provider_subscription_reference) WHERE provider_subscription_reference IS NOT NULL;
