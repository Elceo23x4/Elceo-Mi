CREATE TABLE IF NOT EXISTS app_portfolio_watchlist_entries (
  entry_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  asset TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  thesis_health TEXT NOT NULL,
  note TEXT NULL,
  linked_reasoning_run_id TEXT NULL,
  linked_snapshot_id TEXT NULL,
  linked_drift_id TEXT NULL,
  linked_journal_case_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  entry_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_portfolio_watchlist_subject_updated
  ON app_portfolio_watchlist_entries (subject_kind, subject_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_watchlist_asset_tf_updated
  ON app_portfolio_watchlist_entries (asset, timeframe, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_watchlist_status_updated
  ON app_portfolio_watchlist_entries (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_watchlist_thesis_health_updated
  ON app_portfolio_watchlist_entries (thesis_health, updated_at DESC);

CREATE TABLE IF NOT EXISTS app_portfolio_positions (
  position_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  asset TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  status TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price DOUBLE PRECISION NULL,
  stop_loss DOUBLE PRECISION NULL,
  take_profit_levels_json JSONB NOT NULL,
  size DOUBLE PRECISION NULL,
  opened_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ NULL,
  thesis_health TEXT NOT NULL,
  linked_journal_case_id TEXT NULL,
  linked_reasoning_run_id TEXT NULL,
  linked_snapshot_id TEXT NULL,
  linked_drift_id TEXT NULL,
  note TEXT NULL,
  position_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_portfolio_positions_subject_updated
  ON app_portfolio_positions (subject_kind, subject_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_positions_asset_tf_updated
  ON app_portfolio_positions (asset, timeframe, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_positions_status_updated
  ON app_portfolio_positions (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_positions_thesis_health_updated
  ON app_portfolio_positions (thesis_health, updated_at DESC);

CREATE TABLE IF NOT EXISTS app_portfolio_action_items (
  action_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  asset TEXT NULL,
  timeframe TEXT NULL,
  headline TEXT NOT NULL,
  rationale TEXT NOT NULL,
  linked_entry_id TEXT NULL,
  linked_position_id TEXT NULL,
  linked_journal_case_id TEXT NULL,
  linked_reasoning_run_id TEXT NULL,
  linked_notification_decision_id TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ NULL,
  dismissed_at TIMESTAMPTZ NULL,
  action_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_portfolio_actions_subject_updated
  ON app_portfolio_action_items (subject_kind, subject_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_actions_status_priority_updated
  ON app_portfolio_action_items (status, priority, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_actions_asset_tf_updated
  ON app_portfolio_action_items (asset, timeframe, updated_at DESC);

CREATE TABLE IF NOT EXISTS app_portfolio_revisions (
  revision_id TEXT PRIMARY KEY,
  entity_kind TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  revision_type TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL,
  changed_by_kind TEXT NOT NULL,
  changed_by_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  snapshot_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_portfolio_revisions_entity_changed
  ON app_portfolio_revisions (entity_kind, entity_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_portfolio_revisions_type_changed
  ON app_portfolio_revisions (revision_type, changed_at DESC);

CREATE TABLE IF NOT EXISTS app_portfolio_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  active_watchlist_count INTEGER NOT NULL,
  active_position_count INTEGER NOT NULL,
  weakening_thesis_count INTEGER NOT NULL,
  invalidated_thesis_count INTEGER NOT NULL,
  open_action_count INTEGER NOT NULL,
  critical_action_count INTEGER NOT NULL,
  snapshot_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_subject_generated
  ON app_portfolio_snapshots (subject_kind, subject_id, generated_at DESC);
