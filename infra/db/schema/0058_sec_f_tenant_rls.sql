-- SEC-F: database-enforced tenant boundary. Runtime roles set this only inside a transaction:
-- SELECT set_config('app.authenticated_subject_id', '<server-verified subject>', true).
CREATE SCHEMA IF NOT EXISTS elceo_security;
CREATE OR REPLACE FUNCTION elceo_security.tenant_subject_id() RETURNS text
LANGUAGE sql STABLE PARALLEL SAFE AS $$ SELECT nullif(current_setting('app.authenticated_subject_id', true), '') $$;
REVOKE ALL ON FUNCTION elceo_security.tenant_subject_id() FROM PUBLIC;
GRANT USAGE ON SCHEMA elceo_security TO PUBLIC;
GRANT EXECUTE ON FUNCTION elceo_security.tenant_subject_id() TO PUBLIC;

DO $rls$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'app_notification_targets','app_notification_subscriptions','app_notification_verifications',
    'app_portfolio_watchlist_entries','app_portfolio_positions','app_portfolio_action_items','app_portfolio_snapshots',
    'app_journal_cases','app_journal_influence_snapshots'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS sec_f_tenant ON %I', table_name);
    EXECUTE format('CREATE POLICY sec_f_tenant ON %I USING (subject_kind = ''user'' AND subject_id = elceo_security.tenant_subject_id()) WITH CHECK (subject_kind = ''user'' AND subject_id = elceo_security.tenant_subject_id())', table_name);
  END LOOP;
END $rls$;

ALTER TABLE app_journal_case_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sec_f_tenant ON app_journal_case_revisions;
CREATE POLICY sec_f_tenant ON app_journal_case_revisions
USING (EXISTS (SELECT 1 FROM app_journal_cases parent WHERE parent.case_id=app_journal_case_revisions.case_id))
WITH CHECK (EXISTS (SELECT 1 FROM app_journal_cases parent WHERE parent.case_id=app_journal_case_revisions.case_id));

ALTER TABLE app_portfolio_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sec_f_tenant ON app_portfolio_revisions;
CREATE POLICY sec_f_tenant ON app_portfolio_revisions USING (
  (entity_kind='watchlist_entry' AND EXISTS (SELECT 1 FROM app_portfolio_watchlist_entries p WHERE p.entry_id=entity_id)) OR
  (entity_kind='position' AND EXISTS (SELECT 1 FROM app_portfolio_positions p WHERE p.position_id=entity_id)) OR
  (entity_kind='action_item' AND EXISTS (SELECT 1 FROM app_portfolio_action_items p WHERE p.action_id=entity_id))
) WITH CHECK (
  (entity_kind='watchlist_entry' AND EXISTS (SELECT 1 FROM app_portfolio_watchlist_entries p WHERE p.entry_id=entity_id)) OR
  (entity_kind='position' AND EXISTS (SELECT 1 FROM app_portfolio_positions p WHERE p.position_id=entity_id)) OR
  (entity_kind='action_item' AND EXISTS (SELECT 1 FROM app_portfolio_action_items p WHERE p.action_id=entity_id))
);
