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
import type { BillingEventKind, BillingPlanInterval, BillingProviderKind, BillingSubscriptionRuntimeState, ElceoPlanKind } from '@elceo/types';


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


export type PersistedBillingSubscriptionRecord = {
  subscriptionId: string; subjectKind: 'user'; subjectId: string; providerKind: BillingProviderKind; externalSubscriptionId: string | null;
  planKind: ElceoPlanKind; subscriptionState: BillingSubscriptionRuntimeState; interval: BillingPlanInterval; startedAt: string | null;
  currentPeriodStart: string | null; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean; canceledAt: string | null;
  trialStartedAt: string | null; trialEndsAt: string | null; updatedAt: string;
};
export type PersistedBillingEventRecord = {
  eventId: string; subscriptionId: string; subjectKind: 'user'; subjectId: string; kind: BillingEventKind; providerKind: BillingProviderKind;
  externalEventId: string | null; occurredAt: string; eventJson: string; createdAt: string;
};
export type BillingSubscriptionRepository = {
  getLatestSubscriptionForSubject(subjectKind:'user',subjectId:string): Promise<PersistedBillingSubscriptionRecord | null>;
  getSubscriptionById(subscriptionId:string): Promise<PersistedBillingSubscriptionRecord | null>;
  saveSubscription(record: PersistedBillingSubscriptionRecord): Promise<void>;
  listSubscriptionsForSubject(subjectKind:'user',subjectId:string): Promise<PersistedBillingSubscriptionRecord[]>;
};
export type BillingEventRepository = {
  saveEvent(record: PersistedBillingEventRecord): Promise<void>;
  listEventsForSubscription(subscriptionId:string,limit?:number): Promise<PersistedBillingEventRecord[]>;
  listEventsForSubject(subjectKind:'user',subjectId:string,limit?:number): Promise<PersistedBillingEventRecord[]>;
};


export type PersistedExternalCustomerRecord = import('@elceo/types').BillingExternalCustomerRecord;
export type PersistedExternalSubscriptionRecord = import('@elceo/types').BillingExternalSubscriptionRecord;
export type PersistedExternalEventRecord = import('@elceo/types').BillingExternalEventRecord;
export type PersistedProviderPlanMappingRecord = import('@elceo/types').BillingProviderPlanMapping & { updatedAt: string };

export type ExternalBillingCustomerRepository = {
  getCustomer(providerKind: import('@elceo/types').BillingExternalProviderKind, externalCustomerId: string): Promise<PersistedExternalCustomerRecord | null>;
  saveCustomer(record: PersistedExternalCustomerRecord): Promise<void>;
  getCustomerBySubject(subjectKind: 'user', subjectId: string, providerKind?: import('@elceo/types').BillingExternalProviderKind): Promise<PersistedExternalCustomerRecord | null>;
};
export type ExternalBillingSubscriptionRepository = {
  getSubscription(providerKind: import('@elceo/types').BillingExternalProviderKind, externalSubscriptionId: string): Promise<PersistedExternalSubscriptionRecord | null>;
  saveSubscription(record: PersistedExternalSubscriptionRecord): Promise<void>;
  getLatestSubscriptionForSubject(subjectKind: 'user', subjectId: string, providerKind?: import('@elceo/types').BillingExternalProviderKind): Promise<PersistedExternalSubscriptionRecord | null>;
  listSubscriptionsForSubject(subjectKind: 'user', subjectId: string, providerKind?: import('@elceo/types').BillingExternalProviderKind): Promise<PersistedExternalSubscriptionRecord[]>;
};
export type ExternalBillingEventRepository = {
  getEvent(providerKind: import('@elceo/types').BillingExternalProviderKind, externalEventId: string): Promise<PersistedExternalEventRecord | null>;
  saveEvent(record: PersistedExternalEventRecord): Promise<void>;
  markProcessed(providerKind: import('@elceo/types').BillingExternalProviderKind, externalEventId: string, processingResultCode: string, updatedAt: string): Promise<void>;
  listEventsForSubject(subjectKind: 'user', subjectId: string, limit?: number): Promise<PersistedExternalEventRecord[]>;
  listUnprocessedEvents(limit?: number): Promise<PersistedExternalEventRecord[]>;
};
export type ProviderPlanMappingRepository = {
  getPlanMapping(providerKind: import('@elceo/types').BillingExternalProviderKind, externalPriceId: string): Promise<PersistedProviderPlanMappingRecord | null>;
  upsertPlanMapping(record: PersistedProviderPlanMappingRecord): Promise<void>;
  listPlanMappings(providerKind?: import('@elceo/types').BillingExternalProviderKind): Promise<PersistedProviderPlanMappingRecord[]>;
};


export type PersistedBillingCustomerRecord = import('@elceo/types').CanonicalBillingCustomer;
export type PersistedBillingLifecycleSubscriptionRecord = import('@elceo/types').CanonicalBillingSubscription;
export type PersistedBillingReconciliationRunRecord = import('@elceo/types').BillingReconciliationRun & { runJson: string };

export type BillingCustomerRepository = {
  getCustomerBySubject(subjectKind:'user', subjectId:string, providerKind?: import('@elceo/types').BillingLifecycleProviderKind): Promise<PersistedBillingCustomerRecord | null>;
  getCustomerByProviderId(providerKind: import('@elceo/types').BillingLifecycleProviderKind, providerCustomerId:string): Promise<PersistedBillingCustomerRecord | null>;
  saveCustomer(record: PersistedBillingCustomerRecord): Promise<void>;
};
export type BillingLifecycleSubscriptionRepository = {
  getSubscriptionBySubject(subjectKind:'user', subjectId:string, providerKind?: import('@elceo/types').BillingLifecycleProviderKind): Promise<PersistedBillingLifecycleSubscriptionRecord | null>;
  getSubscriptionByProviderId(providerKind: import('@elceo/types').BillingLifecycleProviderKind, providerSubscriptionId:string): Promise<PersistedBillingLifecycleSubscriptionRecord | null>;
  saveSubscription(record: PersistedBillingLifecycleSubscriptionRecord): Promise<void>;
};
export type BillingReconciliationRunRepository = {
  saveRun(record: PersistedBillingReconciliationRunRecord): Promise<void>;
  getRunById(runId:string): Promise<PersistedBillingReconciliationRunRecord | null>;
  getLatestRunForSubject(subjectKind:'user', subjectId:string): Promise<PersistedBillingReconciliationRunRecord | null>;
  listRecentRunsForSubject(subjectKind:'user', subjectId:string, limit?:number): Promise<PersistedBillingReconciliationRunRecord[]>;
  getLatestRunForProviderEvent(providerKind: import('@elceo/types').BillingLifecycleProviderKind, sourceEventId:string): Promise<PersistedBillingReconciliationRunRecord | null>;
};


export type PersistedBillingPolicyTransitionRecord = import('@elceo/types').BillingPolicyTransition;
export type BillingPolicyTransitionRepository = {
  saveTransition(record: PersistedBillingPolicyTransitionRecord): Promise<void>;
  getTransitionById(transitionId:string): Promise<PersistedBillingPolicyTransitionRecord | null>;
  getLatestTransitionForSubject(subjectKind:'user',subjectId:string): Promise<PersistedBillingPolicyTransitionRecord | null>;
  listRecentTransitionsForSubject(subjectKind:'user',subjectId:string,limit?:number): Promise<PersistedBillingPolicyTransitionRecord[]>;
  getLatestTransitionForReconciliationRun(sourceReconciliationRunId:string): Promise<PersistedBillingPolicyTransitionRecord | null>;
};
