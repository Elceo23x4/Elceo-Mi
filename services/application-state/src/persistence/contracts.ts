import type {
  CanonicalAssetSymbol,
  CanonicalJournalCase,
  JournalCaseRevisionRecord,
  JournalCaseStatus,
  Timeframe
} from '@elceo/types';

export type PersistedJournalCaseRecord = {
  caseId: string;
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  title: string;
  status: JournalCaseStatus;
  direction: CanonicalJournalCase['plan']['direction'];
  conviction: CanonicalJournalCase['plan']['conviction'];
  thesis: string;
  setupType: string;
  entryPricePlanned: number | null;
  stopLossPlanned: number | null;
  takeProfitPlannedJson: string;
  riskAmountPlanned: number | null;
  riskPercentPlanned: number | null;
  invalidationNote: string | null;
  executionChecklistJson: string;
  createdFromReasoningRunId: string | null;
  createdFromSnapshotId: string | null;
  createdFromDriftId: string | null;
  entryPriceExecuted: number | null;
  positionSize: number | null;
  openedAt: string | null;
  lastAdjustedAt: string | null;
  executionNotesJson: string;
  executionQuality: CanonicalJournalCase['execution']['executionQuality'];
  exitPrice: number | null;
  closedAt: string | null;
  pnlAmount: number | null;
  pnlPercent: number | null;
  rMultiple: number | null;
  outcome: CanonicalJournalCase['closure']['outcome'];
  closureReason: string | null;
  reviewedAt: string | null;
  whatWentWellJson: string;
  whatWentWrongJson: string;
  lessonsJson: string;
  behaviorTagsJson: string;
  followUpActionsJson: string;
  tagsJson: string;
  createdAt: string;
  updatedAt: string;
  caseJson: string;
};

export type PersistedJournalCaseRevisionRecord = {
  revisionId: string;
  caseId: string;
  revisionType: JournalCaseRevisionRecord['revisionType'];
  previousStatus: JournalCaseStatus | null;
  nextStatus: JournalCaseStatus;
  changedAt: string;
  changedByKind: JournalCaseRevisionRecord['changedByKind'];
  changedById: string;
  summary: string;
  snapshotJson: string;
};

export type JournalCaseListQuery = {
  subjectKind?: 'user' | 'workspace' | 'ops';
  subjectId?: string;
  asset?: CanonicalAssetSymbol;
  timeframe?: Timeframe;
  status?: JournalCaseStatus;
  createdAfter?: string;
  createdBefore?: string;
  limit?: number;
};

export type JournalCaseRepository = {
  saveCase(record: PersistedJournalCaseRecord): Promise<void>;
  getCaseById(caseId: string): Promise<PersistedJournalCaseRecord | null>;
  listCases(query: JournalCaseListQuery): Promise<PersistedJournalCaseRecord[]>;
  saveRevision(record: PersistedJournalCaseRevisionRecord): Promise<void>;
  listRevisionsForCase(caseId: string): Promise<PersistedJournalCaseRevisionRecord[]>;
  getLatestCaseForReasoningRun(reasoningRunId: string): Promise<PersistedJournalCaseRecord | null>;
};
