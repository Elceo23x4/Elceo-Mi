import type { CanonicalAssetSymbol, Timeframe } from './events';

export type TradeDirection = 'long' | 'short';

export type JournalCaseStatus = 'draft' | 'planned' | 'executed' | 'partially_closed' | 'closed' | 'canceled' | 'reviewed';

export type JournalConvictionLabel = 'exploratory' | 'standard' | 'high_conviction';

export type JournalOutcomeLabel = 'win' | 'loss' | 'breakeven' | 'mixed' | 'open';

export type JournalExecutionQuality = 'disciplined' | 'acceptable' | 'weak' | 'impulsive';

export type JournalSubjectKind = 'user' | 'workspace' | 'ops';
export type JournalActorKind = 'system' | 'user' | 'workspace' | 'ops';

export type JournalCaseIdentity = {
  caseId: string;
  subjectKind: JournalSubjectKind;
  subjectId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  title: string;
};

export type JournalCasePlan = {
  direction: TradeDirection;
  thesis: string;
  setupType: string;
  conviction: JournalConvictionLabel;
  entryPricePlanned: number | null;
  stopLossPlanned: number | null;
  takeProfitPlanned: number[];
  riskAmountPlanned: number | null;
  riskPercentPlanned: number | null;
  invalidationNote: string | null;
  executionChecklist: string[];
  createdFromReasoningRunId: string | null;
  createdFromSnapshotId: string | null;
  createdFromDriftId: string | null;
};

export type JournalCaseExecution = {
  entryPriceExecuted: number | null;
  positionSize: number | null;
  openedAt: string | null;
  lastAdjustedAt: string | null;
  notes: string[];
  executionQuality: JournalExecutionQuality | null;
};

export type JournalCaseClosure = {
  exitPrice: number | null;
  closedAt: string | null;
  pnlAmount: number | null;
  pnlPercent: number | null;
  rMultiple: number | null;
  outcome: JournalOutcomeLabel;
  closureReason: string | null;
};

export type JournalCaseReview = {
  reviewedAt: string | null;
  whatWentWell: string[];
  whatWentWrong: string[];
  lessons: string[];
  behaviorTags: string[];
  followUpActions: string[];
};

export type CanonicalJournalCase = {
  identity: JournalCaseIdentity;
  status: JournalCaseStatus;
  plan: JournalCasePlan;
  execution: JournalCaseExecution;
  closure: JournalCaseClosure;
  review: JournalCaseReview;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type JournalCaseRevisionType =
  | 'created'
  | 'planned'
  | 'executed'
  | 'adjusted'
  | 'partially_closed'
  | 'closed'
  | 'canceled'
  | 'reviewed';

export type JournalCaseRevisionRecord = {
  revisionId: string;
  caseId: string;
  revisionType: JournalCaseRevisionType;
  previousStatus: JournalCaseStatus | null;
  nextStatus: JournalCaseStatus;
  changedAt: string;
  changedByKind: JournalActorKind;
  changedById: string;
  summary: string;
  snapshotJson: string;
};

// Legacy trade journal types retained for compatibility with existing app-state APIs.
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
