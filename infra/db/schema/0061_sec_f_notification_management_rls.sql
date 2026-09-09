-- SEC-F: ordinary-user notification management state is protected at the database boundary.
CREATE INDEX IF NOT EXISTS idx_notification_outbox_subject_created
  ON app_notification_outbox (subject_kind, subject_id, created_at DESC);

ALTER TABLE app_notification_outbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sec_f_tenant ON app_notification_outbox;
CREATE POLICY sec_f_tenant ON app_notification_outbox
USING (subject_kind = 'user' AND subject_id = elceo_security.tenant_subject_id())
WITH CHECK (subject_kind = 'user' AND subject_id = elceo_security.tenant_subject_id());

ALTER TABLE app_notification_inbox ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sec_f_tenant ON app_notification_inbox;
CREATE POLICY sec_f_tenant ON app_notification_inbox
USING (EXISTS (
  SELECT 1 FROM app_notification_targets parent
  WHERE parent.target_id = app_notification_inbox.target_id
))
WITH CHECK (EXISTS (
  SELECT 1 FROM app_notification_targets parent
  WHERE parent.target_id = app_notification_inbox.target_id
));
