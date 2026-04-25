import type { CanonicalAssetSymbol, Timeframe } from './events';
import type { TradeDirection } from './journal';

export type PortfolioRecordStatus = 'active' | 'archived';

export type WatchlistPriority = 'critical' | 'high' | 'medium' | 'low';

export type WatchlistEntryStatus = 'watching' | 'thesis_active' | 'readiness_pending' | 'archived';

export type ThesisHealth = 'strong' | 'stable' | 'weakening' | 'invalidated';

export type PositionStatus = 'proposed' | 'open' | 'reducing' | 'closed' | 'canceled';

export type PortfolioActionKind =
  | 'review_thesis'
  | 'review_risk'
  | 'tighten_execution'
  | 'prepare_entry'
  | 'reduce_exposure'
  | 'close_position'
  | 'review_invalidated_thesis'
  | 'update_journal'
  | 'review_notification_signal';

export type PortfolioActionStatus = 'open' | 'completed' | 'dismissed';

export type PortfolioSubjectKind = 'user' | 'workspace' | 'ops';

export type PortfolioActorKind = 'system' | 'user' | 'workspace' | 'ops';

export type PortfolioEntityKind = 'watchlist_entry' | 'position' | 'action_item';

export type PortfolioRevisionType =
  | 'created'
  | 'updated'
  | 'archived'
  | 'status_changed'
  | 'completed'
  | 'dismissed'
  | 'thesis_health_changed'
  | 'linked'
  | 'closed'
  | 'canceled';

export type WatchlistEntry = {
  entryId: string;
  subjectKind: PortfolioSubjectKind;
  subjectId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  priority: WatchlistPriority;
  status: WatchlistEntryStatus;
  thesisHealth: ThesisHealth;
  note: string | null;
  linkedReasoningRunId: string | null;
  linkedSnapshotId: string | null;
  linkedDriftId: string | null;
  linkedJournalCaseId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PositionRecord = {
  positionId: string;
  subjectKind: PortfolioSubjectKind;
  subjectId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  status: PositionStatus;
  direction: TradeDirection;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfitLevels: number[];
  size: number | null;
  openedAt: string | null;
  updatedAt: string;
  closedAt: string | null;
  thesisHealth: ThesisHealth;
  linkedJournalCaseId: string | null;
  linkedReasoningRunId: string | null;
  linkedSnapshotId: string | null;
  linkedDriftId: string | null;
  note: string | null;
};

export type PortfolioActionItem = {
  actionId: string;
  subjectKind: PortfolioSubjectKind;
  subjectId: string;
  kind: PortfolioActionKind;
  status: PortfolioActionStatus;
  priority: WatchlistPriority;
  asset: CanonicalAssetSymbol | null;
  timeframe: Timeframe | null;
  headline: string;
  rationale: string;
  linkedEntryId: string | null;
  linkedPositionId: string | null;
  linkedJournalCaseId: string | null;
  linkedReasoningRunId: string | null;
  linkedNotificationDecisionId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  dismissedAt: string | null;
};

export type PortfolioRevisionRecord = {
  revisionId: string;
  entityKind: PortfolioEntityKind;
  entityId: string;
  revisionType: PortfolioRevisionType;
  changedAt: string;
  changedByKind: PortfolioActorKind;
  changedById: string;
  summary: string;
  snapshotJson: string;
};

export type CanonicalPortfolioSnapshot = {
  snapshotId: string;
  subjectKind: PortfolioSubjectKind;
  subjectId: string;
  generatedAt: string;
  activeWatchlistCount: number;
  activePositionCount: number;
  weakeningThesisCount: number;
  invalidatedThesisCount: number;
  openActionCount: number;
  criticalActionCount: number;
  watchlistEntries: WatchlistEntry[];
  positions: PositionRecord[];
  actionQueue: PortfolioActionItem[];
  createdAt: string;
};
