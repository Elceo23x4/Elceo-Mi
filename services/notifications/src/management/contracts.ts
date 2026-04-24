import type {
  NotificationChannel,
  NotificationInboxRecord,
  NotificationSubjectKind,
  NotificationTargetChannelStatus,
  NotificationTargetRecord,
  NotificationTargetKind,
  NotificationSubscriptionRecord,
  NotificationPolicyRuleKey,
  Timeframe,
  CanonicalAssetSymbol
} from '@elceo/types';

export type UpsertNotificationTargetInput = {
  subjectKind: NotificationSubjectKind;
  subjectId: string;
  channel: NotificationChannel;
  targetKind: NotificationTargetKind;
  label?: string | null;
  addressJson: string;
  status?: NotificationTargetChannelStatus | null;
  verifiedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type UpsertNotificationSubscriptionInput = {
  subjectKind: NotificationSubjectKind;
  subjectId: string;
  channel: NotificationChannel;
  assetScope: CanonicalAssetSymbol | '*';
  timeframeScope: Timeframe | '*';
  ruleKeyScope: NotificationPolicyRuleKey | '*';
  enabled: boolean;
  minMaterialityScore?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type InboxListQuery = {
  targetId?: string;
  subjectKind?: NotificationSubjectKind;
  subjectId?: string;
  unreadOnly?: boolean;
  includeArchived?: boolean;
  limit?: number;
};

export type NotificationOperationalSummary = {
  subjectTargetCount: number;
  activeTargetCount: number;
  subscriptionCount: number;
  enabledSubscriptionCount: number;
  inboxUnreadCount: number;
  inboxArchivedCount: number;
  recentDeliveredCount: number;
  recentFailedCount: number;
  recentDeadCount: number;
};

export type NotificationDeliveryHealthSummary = {
  asOfIso: string;
  lookbackHours: number | null;
  delivered: number;
  failed: number;
  dead: number;
  staged: number;
  dispatching: number;
};

export type NotificationSubjectDecisionView = {
  decisionId: string;
  decisionKey: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  ruleKey: string;
  shouldNotify: boolean;
  materialityScore: number;
  createdAt: string;
};

export type NotificationManagementDeps = {
  targetRepository: {
    listTargetsForSubject(subjectKind: NotificationSubjectKind, subjectId: string): Promise<NotificationTargetRecord[]>;
  };
  inboxRepository: {
    listInbox(query: InboxListQuery): Promise<NotificationInboxRecord[]>;
  };
};

export type NotificationDetailedSubjectState = {
  targets: NotificationTargetRecord[];
  subscriptions: NotificationSubscriptionRecord[];
  inbox: NotificationInboxRecord[];
};
