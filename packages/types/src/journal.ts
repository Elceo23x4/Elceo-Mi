export type TradeDirection = 'long' | 'short';
export type TradeOutcome = 'win' | 'loss' | 'breakeven';

export type TradeSetupType =
  | 'breakout'
  | 'pullback'
  | 'range-reversal'
  | 'macro-continuation'
  | 'news-volatility'
  | 'mean-reversion'
  | 'trend-continuation'
  | 'other';

export type TradeEmotion =
  | 'calm'
  | 'confident'
  | 'hesitant'
  | 'fearful'
  | 'euphoric'
  | 'revenge'
  | 'frustrated'
  | 'fatigued';

export type TradingSession = 'asia' | 'london' | 'new-york' | 'overlap' | 'other';

export type MistakeCategory =
  | 'none'
  | 'early-entry'
  | 'late-entry'
  | 'stop-moved'
  | 'size-too-large'
  | 'size-too-small'
  | 'rule-violation'
  | 'news-ignorance'
  | 'impulse-trade'
  | 'overtrading'
  | 'other';

export type LessonCategory =
  | 'discipline'
  | 'risk-management'
  | 'timing'
  | 'bias-alignment'
  | 'setup-selection'
  | 'news-awareness'
  | 'emotional-control'
  | 'execution-quality'
  | 'other';

export type TradeJournalMedia = {
  mediaId: string;
  kind: 'image' | 'video' | 'note';
  url: string;
  caption: string;
  uploadedAtUtc: string;
  status: 'pending' | 'ready';
};

export type TradeJournalEntry = {
  entryId: string;
  userId: string;
  asset: string;
  direction: TradeDirection;
  entryPrice: number;
  stopPrice: number;
  takeProfitPrice: number;
  exitPrice: number;
  outcome: TradeOutcome;
  resultRMultiple: number;
  setupType: TradeSetupType;
  reason: string;
  emotion: TradeEmotion;
  sessionTraded: TradingSession;
  majorNewsNearby: boolean;
  followedElceoBias: boolean;
  confidenceBeforeTrade: number;
  confidenceAfterTrade: number;
  mistakeCategory: MistakeCategory;
  lessonCategory: LessonCategory;
  pnlAmount: number;
  tradedAtUtc: string;
  closedAtUtc: string;
  createdAtUtc: string;
  updatedAtUtc: string;
  media: TradeJournalMedia[];
};

export type TradeJournalCreateInput = Omit<TradeJournalEntry, 'entryId' | 'userId' | 'createdAtUtc' | 'updatedAtUtc' | 'outcome' | 'resultRMultiple' | 'pnlAmount'>;

export type TradeJournalListItem = Pick<
  TradeJournalEntry,
  | 'entryId'
  | 'asset'
  | 'direction'
  | 'outcome'
  | 'resultRMultiple'
  | 'pnlAmount'
  | 'setupType'
  | 'emotion'
  | 'sessionTraded'
  | 'tradedAtUtc'
  | 'closedAtUtc'
>;
