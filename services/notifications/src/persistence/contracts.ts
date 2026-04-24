import type {
  CanonicalAssetSymbol,
  NotificationChannel,
  NotificationDecision,
  NotificationInboxRecord,
  NotificationSubscriptionRecord,
  NotificationTargetChannelStatus,
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
  markDelivered(outboxId: string, deliveredAt: string): Promise<void>;
  markFailed(outboxId: string, failedAt: string, nextAvailableAt: string, errorCode: string | null, errorMessage: string | null): Promise<void>;
  markDead(outboxId: string, deadAt: string, errorCode: string | null, errorMessage: string | null): Promise<void>;
  listOutboxForDecision(decisionId: string): Promise<NotificationOutboxRecord[]>;
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

export type NotificationDeliveryStagingAggregateReport = {
  reasoningRunId: string;
  stagedAt: string;
  decisionCount: number;
  notifyingDecisionCount: number;
  stagedOutboxCount: number;
  stagedChannels: NotificationChannel[];
};
