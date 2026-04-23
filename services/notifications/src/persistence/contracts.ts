import type { CanonicalAssetSymbol, NotificationDecision, NotificationChannel, Timeframe } from '@elceo/types';
import type {
  CognitionDriftRepository,
  CognitionSnapshotRepository,
  PersistedCognitionDriftRecord,
  PersistedCognitionSnapshot,
  PersistedReasoningRun,
  ReasoningRunRepository
} from '../../../reasoning/src/persistence/contracts';
import type { NotificationOutboxAttemptRecord, NotificationOutboxRecord, NotificationOutboxReplayBundle } from '../delivery/outbox-contracts';

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

export type NotificationOutboxRepository = {
  stageOutbox(record: NotificationOutboxRecord): Promise<void>;
  getOutboxById(outboxId: string): Promise<NotificationOutboxRecord | null>;
  getOutboxByKey(outboxKey: string): Promise<NotificationOutboxRecord | null>;
  listDueOutboxItems(asOfIso: string, limit: number): Promise<NotificationOutboxRecord[]>;
  markDispatching(outboxId: string, attemptedAt: string): Promise<void>;
  markDelivered(outboxId: string, deliveredAt: string): Promise<void>;
  markFailed(outboxId: string, failedAt: string, nextAvailableAt: string, errorCode: string | null, errorMessage: string | null): Promise<void>;
  markDead(outboxId: string, deadAt: string, errorCode: string | null, errorMessage: string | null): Promise<void>;
  listOutboxForDecision(decisionId: string): Promise<NotificationOutboxRecord[]>;
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
