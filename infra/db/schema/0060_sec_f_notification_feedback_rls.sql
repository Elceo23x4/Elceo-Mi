-- SEC-F closure: user-visible delivery feedback is tenant data; provider events remain system-only.
CREATE INDEX IF NOT EXISTS idx_notification_delivery_receipts_subject_occurred
  ON app_notification_delivery_receipts (subject_kind, subject_id, occurred_at DESC);

ALTER TABLE app_notification_delivery_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sec_f_tenant ON app_notification_delivery_receipts;
CREATE POLICY sec_f_tenant ON app_notification_delivery_receipts
USING (subject_kind = 'user' AND subject_id = elceo_security.tenant_subject_id())
WITH CHECK (subject_kind = 'user' AND subject_id = elceo_security.tenant_subject_id());

-- Health has no subject column and inherits ownership from its protected target.
ALTER TABLE app_notification_target_health ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sec_f_tenant ON app_notification_target_health;
CREATE POLICY sec_f_tenant ON app_notification_target_health
USING (EXISTS (
  SELECT 1 FROM app_notification_targets parent
  WHERE parent.target_id = app_notification_target_health.target_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM app_notification_targets parent
  WHERE parent.target_id = app_notification_target_health.target_id
));
