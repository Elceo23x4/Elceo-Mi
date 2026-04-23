import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type { IngestionTriggerKind } from '../scheduler/trigger-context';
import type { IngestionPublishTopic } from './topic-contracts';

export type OutboxStatus = 'pending' | 'publishing' | 'published' | 'failed' | 'dead';

export type OutboxItemKind = 'run_completed' | 'event_snapshot' | 'run_failed';

export type PersistedOutboxItem = {
  outboxId: string;
  runId: string;
  requestKey: string;
  itemKind: OutboxItemKind;
  topic: IngestionPublishTopic;
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  triggerKind: IngestionTriggerKind;
  slotStartAt: string | null;
  slotEndAt: string | null;
  schedulerTickId: string | null;
  dedupeKey: string;
  payloadJson: string;
  status: OutboxStatus;
  attemptCount: number;
  lastAttemptAt: string | null;
  publishedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  availableAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PersistedOutboxAttempt = {
  attemptId: string;
  outboxId: string;
  attemptedAt: string;
  transport: string;
  success: boolean;
  errorCode: string | null;
  errorMessage: string | null;
};

export type OutboxRepository = {
  stageOutboxItem(item: PersistedOutboxItem): Promise<void>;
  getOutboxById(outboxId: string): Promise<PersistedOutboxItem | null>;
  getOutboxByDedupeKey(dedupeKey: string): Promise<PersistedOutboxItem | null>;
  listDueOutboxItems(limit: number, nowIso: string): Promise<PersistedOutboxItem[]>;
  markOutboxPublishing(outboxId: string, attemptedAt: string): Promise<void>;
  markOutboxPublished(outboxId: string, publishedAt: string): Promise<void>;
  markOutboxFailed(outboxId: string, attemptedAt: string, errorCode: string, errorMessage: string, nextAvailableAt: string): Promise<void>;
  markOutboxDead(outboxId: string, attemptedAt: string, errorCode: string, errorMessage: string): Promise<void>;
  saveAttempt(attempt: PersistedOutboxAttempt): Promise<void>;
  listAttemptsForOutbox(outboxId: string): Promise<PersistedOutboxAttempt[]>;
};
