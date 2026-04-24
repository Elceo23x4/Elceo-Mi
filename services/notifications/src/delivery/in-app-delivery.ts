import type { NotificationInboxRecord } from '@elceo/types';
import type { NotificationInboxRepository } from '../persistence/contracts';
import type { NotificationOutboxRecord } from './outbox-contracts';
import type { NotificationDeliveryEnvelope } from './channel-contracts';

export async function deliverInAppToInbox(
  outboxRecord: NotificationOutboxRecord,
  payloadEnvelope: NotificationDeliveryEnvelope,
  repositories: { inboxRepository: NotificationInboxRepository },
  deliveredAt: string
): Promise<NotificationInboxRecord> {
  const inboxId = `inbox|${outboxRecord.decisionId}|${outboxRecord.targetId}`;
  const existing = await repositories.inboxRepository.getInboxById(inboxId);
  if (existing) return existing;
  const payload = payloadEnvelope.payload;
  const headline = 'subject' in payload ? payload.subject : payload.title;
  const body = payload.body;
  const record: NotificationInboxRecord = {
    inboxId,
    targetId: outboxRecord.targetId,
    decisionId: outboxRecord.decisionId,
    decisionKey: outboxRecord.decisionKey,
    asset: outboxRecord.asset,
    timeframe: outboxRecord.timeframe,
    ruleKey: outboxRecord.ruleKey,
    headline,
    body,
    createdAt: deliveredAt,
    readAt: null,
    archivedAt: null,
    payloadJson: JSON.stringify(payloadEnvelope)
  };
  await repositories.inboxRepository.saveInboxRecord(record);
  return (await repositories.inboxRepository.getInboxById(inboxId)) ?? record;
}
