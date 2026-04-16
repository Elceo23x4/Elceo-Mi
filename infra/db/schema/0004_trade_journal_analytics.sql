-- Slice 6: trade journal, analytics, and coaching persistence

CREATE TABLE IF NOT EXISTS app_trade_journal_entries (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user_profiles(id) ON DELETE CASCADE,
  asset TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price DOUBLE PRECISION NOT NULL,
  stop_price DOUBLE PRECISION NOT NULL,
  take_profit_price DOUBLE PRECISION NOT NULL,
  exit_price DOUBLE PRECISION NOT NULL,
  outcome TEXT NOT NULL,
  result_r_multiple DOUBLE PRECISION NOT NULL,
  setup_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  emotion TEXT NOT NULL,
  session_traded TEXT NOT NULL,
  major_news_nearby BOOLEAN NOT NULL DEFAULT FALSE,
  followed_elceo_bias BOOLEAN NOT NULL DEFAULT TRUE,
  confidence_before_trade DOUBLE PRECISION NOT NULL,
  confidence_after_trade DOUBLE PRECISION NOT NULL,
  mistake_category TEXT NOT NULL,
  lesson_category TEXT NOT NULL,
  pnl_amount DOUBLE PRECISION NOT NULL,
  traded_at_utc TIMESTAMPTZ NOT NULL,
  closed_at_utc TIMESTAMPTZ NOT NULL,
  media JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at_utc TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trade_journal_user_traded ON app_trade_journal_entries(user_id, traded_at_utc DESC);
CREATE INDEX IF NOT EXISTS idx_trade_journal_asset ON app_trade_journal_entries(user_id, asset);
