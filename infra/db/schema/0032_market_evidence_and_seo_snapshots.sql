CREATE TABLE IF NOT EXISTS app_market_evidence_registry_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  generated_at TIMESTAMPTZ NOT NULL,
  registry_json JSONB NOT NULL,
  evidence_type_count INTEGER NOT NULL,
  source_count INTEGER NOT NULL,
  asset_influence_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_evidence_registry_snapshots_generated
  ON app_market_evidence_registry_snapshots (generated_at DESC, snapshot_id ASC);

CREATE TABLE IF NOT EXISTS app_seo_content_architecture_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  generated_at TIMESTAMPTZ NOT NULL,
  architecture_json JSONB NOT NULL,
  keyword_count INTEGER NOT NULL,
  page_count INTEGER NOT NULL,
  internal_link_rule_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_content_architecture_snapshots_generated
  ON app_seo_content_architecture_snapshots (generated_at DESC, snapshot_id ASC);
