-- Additive extension of the single canonical materialization repository.
ALTER TABLE app_canonical_materializations
  DROP CONSTRAINT IF EXISTS app_canonical_materializations_kind_check;

ALTER TABLE app_canonical_materializations
  ADD CONSTRAINT app_canonical_materializations_kind_check
  CHECK (kind IN ('evidence','cognition','dashboard_projection','kick_off_dashboard_context'));
