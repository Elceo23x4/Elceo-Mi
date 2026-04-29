import type {
  CanonicalAssetSymbol,
  CanonicalJournalCase,
  JournalCaseRevisionRecord,
  JournalCaseStatus,
  PortfolioActionStatus,
  PortfolioEntityKind,
  PortfolioRevisionRecord,
  PositionStatus,
  SnapshotDependencyState,
  SnapshotDomainKind,
  SnapshotFreshnessState,
  SnapshotRefreshRunStatus,
  SnapshotRefreshTriggerKind,
  ThesisHealth,
  Timeframe,
  WatchlistEntryStatus,
  OpsJobKind,
  OpsJobRunStatus,
  OpsJobScope,
  OpsLeaseState,
  OpsJobTriggerKind
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

export type PersistedJournalInfluenceSnapshotRecord = {
  snapshotId: string;
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  assetScope: CanonicalAssetSymbol | '*';
  timeframeScope: Timeframe | '*';
  generatedAt: string;
  reviewedCaseCount: number;
  closedCaseCount: number;
  recentCaseCount: number;
  supportingCaseIdsJson: string;
  summaryJson: string;
  createdAt: string;
};

export type JournalInfluenceRepository = {
  saveInfluenceSnapshot(record: PersistedJournalInfluenceSnapshotRecord): Promise<void>;
  getInfluenceSnapshotById(snapshotId: string): Promise<PersistedJournalInfluenceSnapshotRecord | null>;
  getLatestInfluenceSnapshot(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope: CanonicalAssetSymbol | '*',
    timeframeScope: Timeframe | '*'
  ): Promise<PersistedJournalInfluenceSnapshotRecord | null>;
  listInfluenceSnapshots(
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope?: CanonicalAssetSymbol | '*',
    timeframeScope?: Timeframe | '*',
    limit?: number
  ): Promise<PersistedJournalInfluenceSnapshotRecord[]>;
};

export type PersistedWatchlistEntryRecord = {
  entryId: string;
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: WatchlistEntryStatus;
  thesisHealth: ThesisHealth;
  note: string | null;
  linkedReasoningRunId: string | null;
  linkedSnapshotId: string | null;
  linkedDriftId: string | null;
  linkedJournalCaseId: string | null;
  createdAt: string;
  updatedAt: string;
  entryJson: string;
};

export type PersistedPositionRecord = {
  positionId: string;
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  status: PositionStatus;
  direction: 'long' | 'short';
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfitLevelsJson: string;
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
  positionJson: string;
};

export type PersistedPortfolioActionItemRecord = {
  actionId: string;
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  kind: 'review_thesis' | 'review_risk' | 'tighten_execution' | 'prepare_entry' | 'reduce_exposure' | 'close_position' | 'review_invalidated_thesis' | 'update_journal' | 'review_notification_signal';
  status: PortfolioActionStatus;
  priority: 'critical' | 'high' | 'medium' | 'low';
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
  actionJson: string;
};

export type PersistedPortfolioRevisionRecord = {
  revisionId: string;
  entityKind: PortfolioEntityKind;
  entityId: string;
  revisionType: PortfolioRevisionRecord['revisionType'];
  changedAt: string;
  changedByKind: PortfolioRevisionRecord['changedByKind'];
  changedById: string;
  summary: string;
  snapshotJson: string;
};

export type PersistedPortfolioSnapshotRecord = {
  snapshotId: string;
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  generatedAt: string;
  activeWatchlistCount: number;
  activePositionCount: number;
  weakeningThesisCount: number;
  invalidatedThesisCount: number;
  openActionCount: number;
  criticalActionCount: number;
  snapshotJson: string;
  createdAt: string;
};

export type PortfolioEntityListQuery = {
  subjectKind?: 'user' | 'workspace' | 'ops';
  subjectId?: string;
  asset?: CanonicalAssetSymbol;
  timeframe?: Timeframe;
  status?: string;
  thesisHealth?: ThesisHealth;
  limit?: number;
};

export type PortfolioRepository = {
  saveWatchlistEntry(record: PersistedWatchlistEntryRecord): Promise<void>;
  getWatchlistEntryById(entryId: string): Promise<PersistedWatchlistEntryRecord | null>;
  listWatchlistEntries(query: PortfolioEntityListQuery): Promise<PersistedWatchlistEntryRecord[]>;

  savePosition(record: PersistedPositionRecord): Promise<void>;
  getPositionById(positionId: string): Promise<PersistedPositionRecord | null>;
  listPositions(query: PortfolioEntityListQuery): Promise<PersistedPositionRecord[]>;

  saveActionItem(record: PersistedPortfolioActionItemRecord): Promise<void>;
  getActionItemById(actionId: string): Promise<PersistedPortfolioActionItemRecord | null>;
  listActionItems(query: PortfolioEntityListQuery): Promise<PersistedPortfolioActionItemRecord[]>;

  saveRevision(record: PersistedPortfolioRevisionRecord): Promise<void>;
  listRevisionsForEntity(entityKind: PortfolioEntityKind, entityId: string): Promise<PersistedPortfolioRevisionRecord[]>;

  saveSnapshot(record: PersistedPortfolioSnapshotRecord): Promise<void>;
  getLatestSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<PersistedPortfolioSnapshotRecord | null>;
};

export type PersistedWorkspaceSnapshotRecord = {
  snapshotId: string;
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  generatedAt: string;
  healthState: 'stable' | 'attention_needed' | 'critical';
  attentionLevel: 'low' | 'medium' | 'high' | 'critical';
  portfolioSnapshotId: string | null;
  coachingSnapshotId: string | null;
  analyticsSnapshotId: string | null;
  activeWatchlistCount: number;
  activePositionCount: number;
  weakeningThesisCount: number;
  invalidatedThesisCount: number;
  openActionCount: number;
  criticalActionCount: number;
  unreadInboxCount: number;
  degradedTargetCount: number;
  criticalReceiptCount: number;
  focusAreaCount: number;
  actionPlanCount: number;
  topFocusPriority: 'critical' | 'high' | 'medium' | 'low' | null;
  recentReasoningCount: number;
  agendaJson: string;
  dependencyStatusJson: string;
  summaryJson: string;
  createdAt: string;
};

export type WorkspaceSnapshotRepository = {
  saveSnapshot(record: PersistedWorkspaceSnapshotRecord): Promise<void>;
  getSnapshotById(snapshotId: string): Promise<PersistedWorkspaceSnapshotRecord | null>;
  getLatestSnapshot(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<PersistedWorkspaceSnapshotRecord | null>;
  listSnapshots(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number): Promise<PersistedWorkspaceSnapshotRecord[]>;
};

export type PersistedSnapshotRefreshRunRecord = {
  refreshRunId: string;
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  triggerKind: SnapshotRefreshTriggerKind;
  overallStatus: SnapshotRefreshRunStatus;
  generatedAt: string;
  refreshedDomainsJson: string;
  failedDomainsJson: string;
  staleDomainsJson: string;
  warningsJson: string;
  reportJson: string;
  createdAt: string;
};

export type PersistedSnapshotFreshnessRecord = {
  freshnessId: string;
  domain: SnapshotDomainKind;
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  assetScope: CanonicalAssetSymbol | '*';
  timeframeScope: Timeframe | '*';
  latestSnapshotId: string | null;
  freshnessState: SnapshotFreshnessState;
  dependencyState: SnapshotDependencyState;
  snapshotGeneratedAt: string | null;
  evaluatedAt: string;
  ageMinutes: number | null;
  maxFreshMinutes: number;
  failureReason: string | null;
  updatedAt: string;
};

export type SnapshotRefreshRunRepository = {
  saveRun(record: PersistedSnapshotRefreshRunRecord): Promise<void>;
  getRunById(refreshRunId: string): Promise<PersistedSnapshotRefreshRunRecord | null>;
  listRecentRuns(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string, limit?: number): Promise<PersistedSnapshotRefreshRunRecord[]>;
  getLatestRun(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<PersistedSnapshotRefreshRunRecord | null>;
};

export type SnapshotFreshnessRepository = {
  upsertFreshness(record: PersistedSnapshotFreshnessRecord): Promise<void>;
  getFreshness(
    domain: SnapshotDomainKind,
    subjectKind: 'user' | 'workspace' | 'ops',
    subjectId: string,
    assetScope: CanonicalAssetSymbol | '*',
    timeframeScope: Timeframe | '*'
  ): Promise<PersistedSnapshotFreshnessRecord | null>;
  listFreshnessForSubject(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<PersistedSnapshotFreshnessRecord[]>;
  listDomainsNeedingRefresh(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<PersistedSnapshotFreshnessRecord[]>;
};


export type PersistedOpsJobLeaseRecord = {
  leaseId: string; jobKind: OpsJobKind; scopeKind: OpsJobScope; scopeKey: string; leaseState: OpsLeaseState; acquiredAt: string; expiresAt: string; releasedAt: string | null; holderId: string; createdAt: string;
};
export type PersistedOpsJobRunRecord = {
  runId: string; jobKind: OpsJobKind; triggerKind: OpsJobTriggerKind; scopeKind: OpsJobScope; scopeKey: string; startedAt: string; endedAt: string; durationMs: number; status: OpsJobRunStatus; warningsJson: string; failureReason: string | null; childReportIdsJson: string; metricsJson: string; reportJson: string; createdAt: string;
};
export type OpsJobRunListQuery = { jobKind?: OpsJobKind; scopeKind?: OpsJobScope; scopeKey?: string; status?: OpsJobRunStatus; limit?: number; };
export type OpsJobLeaseRepository = {
  acquireLease(params: PersistedOpsJobLeaseRecord): Promise<{ acquired: true; lease: PersistedOpsJobLeaseRecord } | { acquired: false; existingLease: PersistedOpsJobLeaseRecord }>;
  releaseLease(leaseId: string, releasedAt: string): Promise<void>;
  getLeaseByJobScope(jobKind: OpsJobKind, scopeKind: OpsJobScope, scopeKey: string): Promise<PersistedOpsJobLeaseRecord | null>;
  cleanupExpiredLeases(asOfIso: string): Promise<number>;
  listStaleLeases(asOfIso: string): Promise<PersistedOpsJobLeaseRecord[]>;
};
export type OpsJobRunRepository = {
  saveRun(record: PersistedOpsJobRunRecord): Promise<void>;
  getRunById(runId: string): Promise<PersistedOpsJobRunRecord | null>;
  getLatestRun(jobKind: OpsJobKind, scopeKind: OpsJobScope, scopeKey: string): Promise<PersistedOpsJobRunRecord | null>;
  listRecentRuns(query?: OpsJobRunListQuery): Promise<PersistedOpsJobRunRecord[]>;
  listRecentFailedRuns(limit?: number): Promise<PersistedOpsJobRunRecord[]>;
};


export type PersistedAccountEntitlementRecord = { subjectKind: 'user'; subjectId: string; planKind: import('@elceo/types').ElceoPlanKind; accountState: import('@elceo/types').ElceoAccountState; planStartedAt: string | null; planEndsAt: string | null; trialEndsAt: string | null; internalOverride: boolean; updatedAt: string; };
export type PersistedUsageCounterRecord = import('@elceo/types').PersistableUsageCounter;
export type PersistedFeatureAccessDecisionRecord = import('@elceo/types').FeatureAccessDecision & { decisionJson: string; createdAt: string; };
export type AccountEntitlementRepository = { getAccountEntitlement(subjectKind:'user', subjectId:string): Promise<PersistedAccountEntitlementRecord | null>; saveAccountEntitlement(record: PersistedAccountEntitlementRecord): Promise<void>; };
export type UsageCounterRepository = { getUsageCounter(subjectKind:'user', subjectId:string, counterKey: PersistedUsageCounterRecord['counterKey'], period: PersistedUsageCounterRecord['period'], periodStart:string, periodEnd:string): Promise<PersistedUsageCounterRecord | null>; upsertUsageCounter(record: PersistedUsageCounterRecord): Promise<void>; incrementUsageCounter(params: Omit<PersistedUsageCounterRecord,'count'|'updatedAt'> & { incrementBy:number; updatedAt:string }): Promise<PersistedUsageCounterRecord>; listUsageCountersForSubject(subjectKind:'user',subjectId:string): Promise<PersistedUsageCounterRecord[]>; };
export type FeatureAccessDecisionRepository = { saveDecision(record: PersistedFeatureAccessDecisionRecord): Promise<void>; getLatestDecisionForFeature(subjectKind:'user',subjectId:string,feature:PersistedFeatureAccessDecisionRecord['feature']): Promise<PersistedFeatureAccessDecisionRecord | null>; listRecentDecisions(subjectKind:'user',subjectId:string,limit?:number): Promise<PersistedFeatureAccessDecisionRecord[]>; };
