-- Correct the canonical setting name without rewriting deployed migration 0058.
CREATE OR REPLACE FUNCTION elceo_security.tenant_subject_id() RETURNS text
LANGUAGE sql STABLE PARALLEL SAFE
AS $$ SELECT nullif(current_setting('elceo.tenant_subject_id', true), '') $$;

COMMENT ON FUNCTION elceo_security.tenant_subject_id() IS
  'SEC-F transaction-local subject context; NULL means fail-closed for tenant RLS.';
