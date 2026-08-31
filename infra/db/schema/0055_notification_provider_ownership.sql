-- RC-I3: one active OneSignal Subscription ID may have exactly one ELCEO owner.
-- Historical rows are retained; a transfer disables the former row and inserts/reactivates the new owner's row.
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_targets_active_push_subscription_owner
  ON app_notification_targets ((address_json ->> 'subscriptionId'))
  WHERE channel = 'push'
    AND target_kind = 'push_endpoint'
    AND status = 'active'
    AND address_json ? 'subscriptionId';

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_receipts_provider_event
  ON app_notification_delivery_receipts (provider_event_id)
  WHERE provider_event_id IS NOT NULL;
