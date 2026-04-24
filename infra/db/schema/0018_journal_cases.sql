CREATE TABLE IF NOT EXISTS app_journal_cases (
  case_id TEXT PRIMARY KEY,
  subject_kind TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  asset TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  direction TEXT NOT NULL,
  conviction TEXT NOT NULL,
  thesis TEXT NOT NULL,
  setup_type TEXT NOT NULL,
  entry_price_planned DOUBLE PRECISION NULL,
  stop_loss_planned DOUBLE PRECISION NULL,
  take_profit_planned_json JSONB NOT NULL,
  risk_amount_planned DOUBLE PRECISION NULL,
  risk_percent_planned DOUBLE PRECISION NULL,
  invalidation_note TEXT NULL,
  execution_checklist_json JSONB NOT NULL,
  created_from_reasoning_run_id TEXT NULL,
  created_from_snapshot_id TEXT NULL,
  created_from_drift_id TEXT NULL,
  entry_price_executed DOUBLE PRECISION NULL,
  position_size DOUBLE PRECISION NULL,
  opened_at TIMESTAMPTZ NULL,
  last_adjusted_at TIMESTAMPTZ NULL,
  execution_notes_json JSONB NOT NULL,
  execution_quality TEXT NULL,
  exit_price DOUBLE PRECISION NULL,
  closed_at TIMESTAMPTZ NULL,
  pnl_amount DOUBLE PRECISION NULL,
  pnl_percent DOUBLE PRECISION NULL,
  r_multiple DOUBLE PRECISION NULL,
  outcome TEXT NOT NULL,
  closure_reason TEXT NULL,
  reviewed_at TIMESTAMPTZ NULL,
  what_went_well_json JSONB NOT NULL,
  what_went_wrong_json JSONB NOT NULL,
  lessons_json JSONB NOT NULL,
  behavior_tags_json JSONB NOT NULL,
  follow_up_actions_json JSONB NOT NULL,
  tags_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  case_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_journal_cases_subject_created_at ON app_journal_cases (subject_kind, subject_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_cases_asset_timeframe_created_at ON app_journal_cases (asset, timeframe, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_cases_status_created_at ON app_journal_cases (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_cases_reasoning_run ON app_journal_cases (created_from_reasoning_run_id);
CREATE INDEX IF NOT EXISTS idx_journal_cases_snapshot_id ON app_journal_cases (created_from_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_journal_cases_drift_id ON app_journal_cases (created_from_drift_id);

CREATE TABLE IF NOT EXISTS app_journal_case_revisions (
  revision_id TEXT PRIMARY KEY,
  case_id TEXT NOT NULL,
  revision_type TEXT NOT NULL,
  previous_status TEXT NULL,
  next_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL,
  changed_by_kind TEXT NOT NULL,
  changed_by_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  snapshot_json JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_journal_case_revisions_case_changed_at ON app_journal_case_revisions (case_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_case_revisions_type_changed_at ON app_journal_case_revisions (revision_type, changed_at DESC);
