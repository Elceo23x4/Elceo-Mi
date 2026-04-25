CREATE TABLE IF NOT EXISTS app_workspace_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  health_state TEXT NOT NULL,
  attention_level TEXT NOT NULL,
  portfolio_snapshot_id TEXT NULL,
  coaching_snapshot_id TEXT NULL,
  analytics_snapshot_id TEXT NULL,
  active_watchlist_count INTEGER NOT NULL,
  active_position_count INTEGER NOT NULL,
  weakening_thesis_count INTEGER NOT NULL,
  invalidated_thesis_count INTEGER NOT NULL,
  open_action_count INTEGER NOT NULL,
  critical_action_count INTEGER NOT NULL,
  unread_inbox_count INTEGER NOT NULL,
  degraded_target_count INTEGER NOT NULL,
  critical_receipt_count INTEGER NOT NULL,
  focus_area_count INTEGER NOT NULL,
  action_plan_count INTEGER NOT NULL,
  top_focus_priority TEXT NULL,
  recent_reasoning_count INTEGER NOT NULL,
  agenda_json JSONB NOT NULL,
  dependency_status_json JSONB NOT NULL,
  summary_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_subject_generated
  ON app_workspace_snapshots (subject_kind, subject_id, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_health_attention_generated
  ON app_workspace_snapshots (health_state, attention_level, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_portfolio_snapshot
  ON app_workspace_snapshots (portfolio_snapshot_id);

CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_coaching_snapshot
  ON app_workspace_snapshots (coaching_snapshot_id);

CREATE INDEX IF NOT EXISTS idx_workspace_snapshots_analytics_snapshot
  ON app_workspace_snapshots (analytics_snapshot_id);
