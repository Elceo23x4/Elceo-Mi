-- SEC-A1: support mandatory owner-scoped entity and target authority predicates.
CREATE INDEX IF NOT EXISTS idx_portfolio_watchlist_owner_entity ON app_portfolio_watchlist_entries(subject_kind, subject_id, entry_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_positions_owner_entity ON app_portfolio_positions(subject_kind, subject_id, position_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_actions_owner_entity ON app_portfolio_action_items(subject_kind, subject_id, action_id);
CREATE INDEX IF NOT EXISTS idx_journal_cases_owner_entity ON app_journal_cases(subject_kind, subject_id, case_id);
CREATE INDEX IF NOT EXISTS idx_notification_targets_owner_entity ON app_notification_targets(subject_kind, subject_id, target_id);
