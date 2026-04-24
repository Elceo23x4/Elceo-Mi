CREATE TABLE IF NOT EXISTS app_analytics_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  asset_scope TEXT NOT NULL,
  timeframe_scope TEXT NOT NULL,
  lookback_days INTEGER NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  closed_case_count INTEGER NOT NULL,
  reviewed_case_count INTEGER NOT NULL,
  win_count INTEGER NOT NULL,
  loss_count INTEGER NOT NULL,
  breakeven_count INTEGER NOT NULL,
  mixed_count INTEGER NOT NULL,
  open_count INTEGER NOT NULL,
  linked_reasoning_count INTEGER NOT NULL,
  linked_drift_count INTEGER NOT NULL,
  avg_r_multiple DOUBLE PRECISION NULL,
  avg_pnl_percent DOUBLE PRECISION NULL,
  median_r_multiple DOUBLE PRECISION NULL,
  median_pnl_percent DOUBLE PRECISION NULL,
  win_rate DOUBLE PRECISION NULL,
  loss_rate DOUBLE PRECISION NULL,
  expectancy_r DOUBLE PRECISION NULL,
  discipline_score DOUBLE PRECISION NULL,
  adherence_score DOUBLE PRECISION NULL,
  setup_patterns_json JSONB NOT NULL,
  direction_patterns_json JSONB NOT NULL,
  behavior_patterns_json JSONB NOT NULL,
  review_insights_json JSONB NOT NULL,
  supporting_case_ids_json JSONB NOT NULL,
  summary_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_subject_generated_at
  ON app_analytics_snapshots (subject_kind, subject_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_scope_generated_at
  ON app_analytics_snapshots (asset_scope, timeframe_scope, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_subject_scope_generated_at
  ON app_analytics_snapshots (subject_kind, subject_id, asset_scope, timeframe_scope, generated_at DESC);
