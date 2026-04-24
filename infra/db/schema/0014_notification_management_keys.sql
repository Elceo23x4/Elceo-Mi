ALTER TABLE app_notification_targets
  ADD COLUMN IF NOT EXISTS target_key TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_targets_target_key_unique
  ON app_notification_targets (target_key)
  WHERE target_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_targets_subject_channel_key
  ON app_notification_targets (subject_kind, subject_id, channel, target_key);

ALTER TABLE app_notification_subscriptions
  ADD COLUMN IF NOT EXISTS subscription_key TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_subscriptions_subscription_key_unique
  ON app_notification_subscriptions (subscription_key)
  WHERE subscription_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_subject_channel_key
  ON app_notification_subscriptions (subject_kind, subject_id, channel, subscription_key);
