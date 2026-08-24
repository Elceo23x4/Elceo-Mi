CREATE TABLE IF NOT EXISTS app_canonical_materializations (
  identity TEXT PRIMARY KEY,
  scope_hash TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('evidence','cognition')),
  artifact_json JSONB NOT NULL,
  integrity_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS app_canonical_materializations_scope_created_idx ON app_canonical_materializations(scope_hash,created_at DESC);
