-- RC-I3 normalized OneSignal identity supports canonical {subscriptionId} and narrow legacy {value}.
-- Latest-owner-wins migration: updated_at DESC then target_id DESC is the deterministic winner.
-- Every older row remains attributed to its original subject and is only transitioned to disabled.
WITH ranked AS (
  SELECT target_id,
         row_number() OVER (
           PARTITION BY COALESCE(NULLIF(address_json ->> 'subscriptionId', ''), address_json ->> 'value')
           ORDER BY updated_at DESC, target_id DESC
         ) AS ownership_rank
  FROM app_notification_targets
  WHERE channel = 'push'
    AND target_kind = 'push_endpoint'
    AND status = 'active'
    AND COALESCE(NULLIF(address_json ->> 'subscriptionId', ''), address_json ->> 'value') IS NOT NULL
)
UPDATE app_notification_targets AS target
SET status = 'disabled'
FROM ranked
WHERE target.target_id = ranked.target_id
  AND ranked.ownership_rank > 1;

DROP INDEX IF EXISTS idx_notification_targets_active_push_subscription_owner;
CREATE UNIQUE INDEX idx_notification_targets_active_push_subscription_owner
  ON app_notification_targets ((COALESCE(NULLIF(address_json ->> 'subscriptionId', ''), address_json ->> 'value')))
  WHERE channel = 'push'
    AND target_kind = 'push_endpoint'
    AND status = 'active'
    AND COALESCE(NULLIF(address_json ->> 'subscriptionId', ''), address_json ->> 'value') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_receipts_provider_event
  ON app_notification_delivery_receipts (provider_event_id)
  WHERE provider_event_id IS NOT NULL;
