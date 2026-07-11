import type {
  CanonicalAssetSymbol,
  NotificationChannel,
  NotificationDecision,
  NotificationInboxRecord,
  NotificationProviderEventKind,
  NotificationReceiptSeverity,
  NotificationSubscriptionRecord,
  NotificationTargetChannelStatus,
  NotificationTargetHealthRecord,
  NotificationTargetRecord,
  NotificationVerificationKind,
  NotificationVerificationRecord,
  Timeframe
} from '@elceo/types';
import type {
  CognitionDriftRepository,
  CognitionSnapshotRepository,
  PersistedCognitionDriftRecord,
  PersistedCognitionSnapshot,
  PersistedReasoningRun,
  ReasoningRunRepository
} from '../../../reasoning/src/persistence/contracts';
import type { NotificationOutboxAttemptRecord, NotificationOutboxRecord, NotificationOutboxReplayBundle } from '../delivery/outbox-contracts';
import type { InboxListQuery } from '../management/contracts';
import type { NotificationOrchestrationRunReport, NotificationOrchestrationStage } from '../orchestration/contracts';

export type PersistedNotificationDecisionRecord = {
  decisionId: string;
  decisionKey: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  ruleKey: string;
  triggerKind: string;
  reasoningRunId: string | null;
  snapshotId: string | null;
  driftId: string | null;
  materialityScore: number;
  shouldNotify: boolean;
  suppressionReason: string | null;
  channelsJson: string;
  cooldownUntil: string | null;
  headline: string;
  body: string;
  createdAt: string;
  decisionJson: string;
};

export type PersistedNotificationProviderEventRecord = {
  providerEventId: string;
  providerKind: string;
  channel: NotificationChannel;
  providerMessageId: string | null;
  eventKind: NotificationProviderEventKind;
  occurredAt: string;
  targetId: string | null;
  outboxId: string | null;
  attemptId: string | null;
  decisionId: string | null;
  decisionKey: string | null;
  reasonCode: string | null;
  reasonMessage: string | null;
  rawEventJson: string;
  normalizedMetaJson: string | null;
  createdAt: string;
};

export type PersistedNotificationDeliveryReceiptRecord = {
  receiptId: string;
  providerEventId: string | null;
  providerKind: string;
  channel: NotificationChannel;
  decisionId: string | null;
  decisionKey: string | null;
  outboxId: string | null;
  attemptId: string | null;
  targetId: string | null;
  subjectKind: 'user' | 'workspace' | 'ops' | null;
  subjectId: string | null;
  providerMessageId: string | null;
  eventKind: NotificationProviderEventKind;
  severity: NotificationReceiptSeverity;
  occurredAt: string;
  reasonCode: string | null;
  reasonMessage: string | null;
  rawEventJson: string;
  normalizedMetaJson: string | null;
  createdAt: string;
};

export type PersistedNotificationTargetHealthRecord = NotificationTargetHealthRecord;

export type NotificationDecisionRepository = {
  saveDecision(record: PersistedNotificationDecisionRecord): Promise<void>;
  getDecisionById(decisionId: string): Promise<PersistedNotificationDecisionRecord | null>;
  getDecisionByKey(decisionKey: string): Promise<PersistedNotificationDecisionRecord | null>;
  getLatestDecisionForRule(asset: CanonicalAssetSymbol, timeframe: Timeframe, ruleKey: string): Promise<PersistedNotificationDecisionRecord | null>;
  listRecentDecisions(params: { limit: number; asset?: CanonicalAssetSymbol; timeframe?: Timeframe; shouldNotify?: boolean; ruleKey?: string }): Promise<PersistedNotificationDecisionRecord[]>;
  listDecisionsForReasoningRun(reasoningRunId: string): Promise<PersistedNotificationDecisionRecord[]>;
};

export type NotificationTargetRepository = {
  saveTarget(record: NotificationTargetRecord): Promise<void>;
  getTargetById(targetId: string): Promise<NotificationTargetRecord | null>;
  getTargetByKey(targetKey: string): Promise<NotificationTargetRecord | null>;
  upsertTargetByKey(record: NotificationTargetRecord): Promise<void>;
  updateTargetStatus(targetId: string, status: NotificationTargetChannelStatus, updatedAt: string, verifiedAt?: string): Promise<void>;
  listTargetsForSubject(subjectKind: NotificationTargetRecord['subjectKind'], subjectId: string): Promise<NotificationTargetRecord[]>;
  listActiveTargetsForChannel(channel: NotificationChannel): Promise<NotificationTargetRecord[]>;
  listTargetsByIds(targetIds: string[]): Promise<NotificationTargetRecord[]>;
};

export type NotificationSubscriptionRepository = {
  saveSubscription(record: NotificationSubscriptionRecord): Promise<void>;
  getSubscriptionById(subscriptionId: string): Promise<NotificationSubscriptionRecord | null>;
  getSubscriptionByKey(subscriptionKey: string): Promise<NotificationSubscriptionRecord | null>;
  upsertSubscriptionByKey(record: NotificationSubscriptionRecord): Promise<void>;
  updateSubscriptionEnabled(subscriptionId: string, enabled: boolean, updatedAt: string): Promise<void>;
  updateSubscriptionThreshold(subscriptionId: string, minMaterialityScore: number | null, updatedAt: string): Promise<void>;
  listSubscriptionsForSubject(subjectKind: NotificationSubscriptionRecord['subjectKind'], subjectId: string): Promise<NotificationSubscriptionRecord[]>;
  listEnabledSubscriptionsForChannel(channel: NotificationChannel): Promise<NotificationSubscriptionRecord[]>;
};

export type NotificationInboxRepository = {
  saveInboxRecord(record: NotificationInboxRecord): Promise<void>;
  getInboxById(inboxId: string): Promise<NotificationInboxRecord | null>;
  listInboxForTarget(targetId: string, limit?: number): Promise<NotificationInboxRecord[]>;
  listInbox(query: InboxListQuery): Promise<NotificationInboxRecord[]>;
  markRead(inboxId: string, readAt: string): Promise<void>;
  markUnread(inboxId: string): Promise<void>;
  markArchived(inboxId: string, archivedAt: string): Promise<void>;
  markUnarchived(inboxId: string): Promise<void>;
  listInboxForDecision(decisionId: string): Promise<NotificationInboxRecord[]>;
};

export type NotificationOutboxRepository = {
  stageOutbox(record: NotificationOutboxRecord): Promise<void>;
  getOutboxById(outboxId: string): Promise<NotificationOutboxRecord | null>;
  getOutboxByKey(outboxKey: string): Promise<NotificationOutboxRecord | null>;
  listDueOutboxItems(asOfIso: string, limit: number): Promise<NotificationOutboxRecord[]>;
  listRecentOutboxItems(asOfIso: string, lookbackHours: number | null, limit: number): Promise<NotificationOutboxRecord[]>;
  markDispatching(outboxId: string, attemptedAt: string): Promise<void>;
  claimDueOutboxItem(outboxId: string, asOfIso: string): Promise<NotificationOutboxRecord | null>;
  markDelivered(outboxId: string, deliveredAt: string): Promise<void>;
  markFailed(outboxId: string, failedAt: string, nextAvailableAt: string, errorCode: string | null, errorMessage: string | null): Promise<void>;
  markDead(outboxId: string, deadAt: string, errorCode: string | null, errorMessage: string | null): Promise<void>;
  listOutboxForDecision(decisionId: string): Promise<NotificationOutboxRecord[]>;
};

export type PersistedNotificationOrchestrationRunRecord = {
  orchestrationRunId: string;
  stage: NotificationOrchestrationStage;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  status: 'success' | 'partial_success' | 'failed';
  reasoningRunId: string | null;
  policyEvaluationId: string | null;
  evaluatedDecisionCount: number;
  notifyingDecisionCount: number;
  stagedOutboxCount: number;
  dispatchedOutboxCount: number;
  deliveredCount: number;
  failedCount: number;
  deadCount: number;
  expiredVerificationCount: number;
  failureReason: string | null;
  warningsJson: string;
  createdAt: string;
  reportJson: string;
};

export type NotificationOrchestrationRunRepository = {
  saveRun(record: PersistedNotificationOrchestrationRunRecord): Promise<void>;
  getRunById(orchestrationRunId: string): Promise<PersistedNotificationOrchestrationRunRecord | null>;
  listRecentRuns(stage?: NotificationOrchestrationStage, limit?: number): Promise<PersistedNotificationOrchestrationRunRecord[]>;
  getLatestRunForReasoningRun(reasoningRunId: string): Promise<PersistedNotificationOrchestrationRunRecord | null>;
};



export type NotificationVerificationRepository = {
  saveVerification(record: NotificationVerificationRecord): Promise<void>;
  getVerificationById(verificationId: string): Promise<NotificationVerificationRecord | null>;
  getVerificationByKey(verificationKey: string): Promise<NotificationVerificationRecord | null>;
  getLatestActiveVerificationForTarget(targetId: string, verificationKind: NotificationVerificationKind): Promise<NotificationVerificationRecord | null>;
  listVerificationsForTarget(targetId: string): Promise<NotificationVerificationRecord[]>;
  listPendingVerificationsExpiringBefore(asOfIso: string): Promise<NotificationVerificationRecord[]>;
  markVerificationConsumed(verificationId: string, consumedAt: string): Promise<void>;
  markVerificationExpired(verificationId: string, updatedAt: string): Promise<void>;
  markVerificationCanceled(verificationId: string, updatedAt: string): Promise<void>;
  incrementVerificationAttempt(verificationId: string, attemptedAt: string): Promise<void>;
};

export type NotificationOutboxAttemptRepository = {
  saveAttempt(record: NotificationOutboxAttemptRecord): Promise<void>;
  listAttemptsForOutbox(outboxId: string): Promise<NotificationOutboxAttemptRecord[]>;
  getLatestAttemptByProviderMessageId(providerMessageId: string): Promise<NotificationOutboxAttemptRecord | null>;
};

export type NotificationProviderEventRepository = {
  saveProviderEvent(record: PersistedNotificationProviderEventRecord): Promise<void>;
  getProviderEventById(providerEventId: string): Promise<PersistedNotificationProviderEventRecord | null>;
  listProviderEventsForTarget(targetId: string, limit?: number): Promise<PersistedNotificationProviderEventRecord[]>;
  listRecentProviderEvents(providerKind?: string, limit?: number): Promise<PersistedNotificationProviderEventRecord[]>;
};

export type NotificationDeliveryReceiptRepository = {
  saveReceipt(record: PersistedNotificationDeliveryReceiptRecord): Promise<void>;
  getReceiptById(receiptId: string): Promise<PersistedNotificationDeliveryReceiptRecord | null>;
  listReceiptsForTarget(targetId: string, limit?: number): Promise<PersistedNotificationDeliveryReceiptRecord[]>;
  listReceiptsForDecision(decisionId: string, limit?: number): Promise<PersistedNotificationDeliveryReceiptRecord[]>;
  listReceiptsForOutbox(outboxId: string, limit?: number): Promise<PersistedNotificationDeliveryReceiptRecord[]>;
  listRecentReceipts(eventKind?: NotificationProviderEventKind, limit?: number): Promise<PersistedNotificationDeliveryReceiptRecord[]>;
};

export type NotificationTargetHealthRepository = {
  saveTargetHealth(record: PersistedNotificationTargetHealthRecord): Promise<void>;
  getTargetHealth(targetId: string): Promise<PersistedNotificationTargetHealthRecord | null>;
  listTargetHealthForSubject(subjectKind: 'user' | 'workspace' | 'ops', subjectId: string): Promise<PersistedNotificationTargetHealthRecord[]>;
};

export type NotificationPolicyLoadRepositories = {
  runRepository: ReasoningRunRepository;
  snapshotRepository: CognitionSnapshotRepository;
  driftRepository: CognitionDriftRepository;
  decisionRepository: NotificationDecisionRepository;
};

export type NotificationPolicyEvaluationRepositories = NotificationPolicyLoadRepositories;

export type NotificationDeliveryRuntimeRepositories = NotificationPolicyLoadRepositories & {
  outboxRepository: NotificationOutboxRepository;
  outboxAttemptRepository: NotificationOutboxAttemptRepository;
  targetRepository: NotificationTargetRepository;
  subscriptionRepository: NotificationSubscriptionRepository;
  inboxRepository: NotificationInboxRepository;
  verificationRepository: NotificationVerificationRepository;
  orchestrationRunRepository: NotificationOrchestrationRunRepository;
  providerEventRepository?: NotificationProviderEventRepository;
  receiptRepository?: NotificationDeliveryReceiptRepository;
  targetHealthRepository?: NotificationTargetHealthRepository;
};

export type NotificationDecisionReplayBundle = {
  record: PersistedNotificationDecisionRecord;
  decision: NotificationDecision;
};

export type NotificationPolicySourceArtifacts = {
  reasoningRun: PersistedReasoningRun;
  cognitionSnapshot: PersistedCognitionSnapshot | null;
  driftRecord: PersistedCognitionDriftRecord | null;
};

export type NotificationDeliveryReplayBundle = NotificationOutboxReplayBundle;
export type NotificationOrchestrationReplayBundle = {
  record: PersistedNotificationOrchestrationRunRecord;
  report: NotificationOrchestrationRunReport;
};
