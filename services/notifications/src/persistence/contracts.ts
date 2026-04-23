import type { CanonicalAssetSymbol, NotificationDecision, Timeframe } from '@elceo/types';
import type {
  CognitionDriftRepository,
  CognitionSnapshotRepository,
  PersistedCognitionDriftRecord,
  PersistedCognitionSnapshot,
  PersistedReasoningRun,
  ReasoningRunRepository
} from '../../../reasoning/src/persistence/contracts';

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

export type NotificationPolicyLoadRepositories = {
  runRepository: ReasoningRunRepository;
  snapshotRepository: CognitionSnapshotRepository;
  driftRepository: CognitionDriftRepository;
  decisionRepository: NotificationDecisionRepository;
};

export type NotificationPolicyEvaluationRepositories = NotificationPolicyLoadRepositories;

export type NotificationDecisionReplayBundle = {
  record: PersistedNotificationDecisionRecord;
  decision: NotificationDecision;
};

export type NotificationPolicySourceArtifacts = {
  reasoningRun: PersistedReasoningRun;
  cognitionSnapshot: PersistedCognitionSnapshot | null;
  driftRecord: PersistedCognitionDriftRecord | null;
};
