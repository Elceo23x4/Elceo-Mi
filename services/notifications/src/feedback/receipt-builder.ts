import { createHash } from 'node:crypto';
import type { NotificationDeliveryReceipt, NotificationProviderEventKind, NotificationReceiptSeverity } from '@elceo/types';
import type { CorrelatedProviderEntities } from './correlation';
import type { NormalizedProviderEvent } from './normalizers';

const mapSeverity = (eventKind: NotificationProviderEventKind): NotificationReceiptSeverity => {
  switch (eventKind) {
    case 'accepted':
    case 'delivered':
      return 'info';
    case 'complained':
    case 'unsubscribed':
    case 'invalid_target':
      return 'critical';
    default:
      return 'warning';
  }
};

const fallbackKey = (event: NormalizedProviderEvent): string => createHash('sha256').update(`${event.providerKind}|${event.providerMessageId ?? 'none'}|${event.occurredAt}|${event.eventKind}`).digest('hex').slice(0, 18);

export function buildNotificationDeliveryReceipt(normalizedEvent: NormalizedProviderEvent, correlatedEntities: CorrelatedProviderEntities, nowIso: string): NotificationDeliveryReceipt {
  const stableEventId = normalizedEvent.providerEventId || fallbackKey(normalizedEvent);
  return {
    receiptId: `receipt|${normalizedEvent.providerKind}|${stableEventId}`,
    providerEventId: normalizedEvent.providerEventId,
    providerKind: normalizedEvent.providerKind,
    channel: normalizedEvent.channel,
    decisionId: correlatedEntities.decisionId,
    decisionKey: correlatedEntities.decisionKey,
    outboxId: correlatedEntities.outboxId,
    attemptId: correlatedEntities.attemptId,
    targetId: correlatedEntities.targetId,
    subjectKind: correlatedEntities.subjectKind,
    subjectId: correlatedEntities.subjectId,
    providerMessageId: normalizedEvent.providerMessageId,
    eventKind: normalizedEvent.eventKind,
    severity: mapSeverity(normalizedEvent.eventKind),
    occurredAt: normalizedEvent.occurredAt,
    reasonCode: normalizedEvent.reasonCode,
    reasonMessage: normalizedEvent.reasonMessage,
    rawEventJson: normalizedEvent.rawEventJson,
    normalizedMetaJson: normalizedEvent.normalizedMetaJson,
    createdAt: nowIso
  };
}
