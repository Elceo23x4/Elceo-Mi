import type { CanonicalAssetSymbol, NotificationChannel, Timeframe } from '@elceo/types';
import type { NotificationDeliveryEnvelope } from './channel-contracts';

export type NotificationOutboxStatus = 'staged' | 'dispatching' | 'delivered' | 'failed' | 'dead';

export type NotificationOutboxAttemptStatus = 'success' | 'failure';

export type NotificationOutboxRecord = {
  outboxId: string;
  outboxKey: string;
  decisionId: string;
  decisionKey: string;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  ruleKey: string;
  channel: NotificationChannel;
  targetId: string;
  subjectKind: 'user' | 'workspace' | 'ops';
  subjectId: string;
  targetKey: string;
  deliveryAddressJson: string;
  status: NotificationOutboxStatus;
  availableAt: string;
  lastAttemptAt: string | null;
  deliveredAt: string | null;
  deadAt: string | null;
  attemptCount: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  payloadJson: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationOutboxAttemptRecord = {
  attemptId: string;
  outboxId: string;
  channel: NotificationChannel;
  attemptedAt: string;
  status: NotificationOutboxAttemptStatus;
  errorCode: string | null;
  errorMessage: string | null;
  responseMetaJson: string | null;
};

export type NotificationOutboxReplayBundle = {
  outbox: NotificationOutboxRecord;
  attempts: NotificationOutboxAttemptRecord[];
  payload: NotificationDeliveryEnvelope;
};
