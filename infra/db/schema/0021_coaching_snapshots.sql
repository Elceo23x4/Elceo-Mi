CREATE TABLE IF NOT EXISTS app_coaching_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  asset_scope TEXT NOT NULL,
  timeframe_scope TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  analytics_snapshot_id TEXT NULL,
  journal_influence_snapshot_id TEXT NULL,
  total_signals_considered INTEGER NOT NULL,
  focus_areas_json JSONB NOT NULL,
  strengths_json JSONB NOT NULL,
  action_plan_json JSONB NOT NULL,
  summary_notes_json JSONB NOT NULL,
  supporting_case_ids_json JSONB NOT NULL,
  summary_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coaching_snapshots_subject_generated_at
  ON app_coaching_snapshots (subject_kind, subject_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_coaching_snapshots_scope_generated_at
  ON app_coaching_snapshots (asset_scope, timeframe_scope, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_coaching_snapshots_subject_scope_generated_at
  ON app_coaching_snapshots (subject_kind, subject_id, asset_scope, timeframe_scope, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_coaching_snapshots_analytics_snapshot_id
  ON app_coaching_snapshots (analytics_snapshot_id);

CREATE INDEX IF NOT EXISTS idx_coaching_snapshots_journal_influence_snapshot_id
  ON app_coaching_snapshots (journal_influence_snapshot_id);
