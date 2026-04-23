import type { NotificationChannel, NotificationDecision } from '@elceo/types';
import type { NotificationDecisionRepository, NotificationOutboxAttemptRepository, NotificationOutboxRepository, PersistedNotificationDecisionRecord } from '../persistence/contracts';
import type { NotificationOutboxRecord } from './outbox-contracts';
import { buildNotificationOutboxKey } from './outbox-dedupe';
import { buildChannelPayloadForDecision } from './payload-builders';
import type { DeliverySupportedChannel } from './channel-contracts';

export type NotificationDeliveryStagingReport = {
  decisionId: string;
  attemptedChannelCount: number;
  stagedChannelCount: number;
  channels: NotificationChannel[];
  outboxIds: string[];
  skipped: boolean;
};

export type NotificationDeliveryStagingRepositories = {
  decisionRepository: NotificationDecisionRepository;
  outboxRepository: NotificationOutboxRepository;
  outboxAttemptRepository: NotificationOutboxAttemptRepository;
};

const SUPPORTED_CHANNELS: DeliverySupportedChannel[] = ['in_app', 'push', 'email'];

export async function stageNotificationDeliveryForDecision(
  record: PersistedNotificationDecisionRecord,
  decision: NotificationDecision,
  repositories: NotificationDeliveryStagingRepositories,
  stagedAt: string
): Promise<NotificationDeliveryStagingReport> {
  if (!decision.shouldNotify || !record.shouldNotify) {
    return { decisionId: record.decisionId, attemptedChannelCount: 0, stagedChannelCount: 0, channels: [], outboxIds: [], skipped: true };
  }

  const channels = decision.channels.filter((channel): channel is DeliverySupportedChannel => SUPPORTED_CHANNELS.includes(channel as DeliverySupportedChannel));
  const outboxIds: string[] = [];

  for (const channel of channels) {
    const payload = buildChannelPayloadForDecision(record, decision, channel);
    const outboxKey = buildNotificationOutboxKey(record.decisionKey, channel);
    const outboxId = outboxKey;
    const existing = await repositories.outboxRepository.getOutboxByKey(outboxKey);
    if (!existing) {
      const now = stagedAt;
      const outboxRecord: NotificationOutboxRecord = {
        outboxId,
        outboxKey,
        decisionId: record.decisionId,
        decisionKey: record.decisionKey,
        asset: record.asset,
        timeframe: record.timeframe,
        ruleKey: record.ruleKey,
        channel,
        status: 'staged',
        availableAt: stagedAt,
        lastAttemptAt: null,
        deliveredAt: null,
        deadAt: null,
        attemptCount: 0,
        lastErrorCode: null,
        lastErrorMessage: null,
        payloadJson: JSON.stringify(payload),
        createdAt: now,
        updatedAt: now
      };
      await repositories.outboxRepository.stageOutbox(outboxRecord);
    }
    const persisted = await repositories.outboxRepository.getOutboxByKey(outboxKey);
    if (persisted) outboxIds.push(persisted.outboxId);
  }

  return {
    decisionId: record.decisionId,
    attemptedChannelCount: channels.length,
    stagedChannelCount: outboxIds.length,
    channels,
    outboxIds,
    skipped: false
  };
}
