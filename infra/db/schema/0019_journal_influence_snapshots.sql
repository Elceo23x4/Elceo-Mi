CREATE TABLE IF NOT EXISTS app_journal_influence_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  asset_scope TEXT NOT NULL,
  timeframe_scope TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  reviewed_case_count INTEGER NOT NULL,
  closed_case_count INTEGER NOT NULL,
  recent_case_count INTEGER NOT NULL,
  supporting_case_ids_json JSONB NOT NULL,
  summary_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_journal_influence_subject_generated_at
  ON app_journal_influence_snapshots (subject_kind, subject_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_journal_influence_scope_generated_at
  ON app_journal_influence_snapshots (asset_scope, timeframe_scope, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_journal_influence_subject_scope_generated_at
  ON app_journal_influence_snapshots (subject_kind, subject_id, asset_scope, timeframe_scope, generated_at DESC);
