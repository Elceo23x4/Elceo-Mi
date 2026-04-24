import { deliverInAppToInbox } from '../delivery/in-app-delivery.js';
import { MemoryNotificationInboxRepository } from '../persistence/memory-notification-repository.js';
import type { NotificationOutboxRecord } from '../delivery/outbox-contracts.js';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

export async function runInAppDeliveryTests(): Promise<void> {
  const inboxRepository = new MemoryNotificationInboxRepository();
  const outbox: NotificationOutboxRecord = { outboxId: 'o', outboxKey: 'o', decisionId: 'd1', decisionKey: 'k1', asset: 'XAU/USD', timeframe: 'H1', ruleKey: 'critical_drift', channel: 'in_app', targetId: 't1', subjectKind: 'user', subjectId: 'u1', targetKey: 'target|t1', deliveryAddressJson: '{}', status: 'staged', availableAt: '2026-01-15T10:00:00.000Z', lastAttemptAt: null, deliveredAt: null, deadAt: null, attemptCount: 0, lastErrorCode: null, lastErrorMessage: null, payloadJson: '{}', createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z' };
  await deliverInAppToInbox(outbox, { channel: 'in_app', targetId: 't1', targetKind: 'in_app_user', addressJson: '{}', payload: { title: 'h', body: 'b', decisionId: 'd1', ruleKey: 'critical_drift', asset: 'XAU/USD', timeframe: 'H1', createdAt: '2026-01-15T10:00:00.000Z' } }, { inboxRepository }, '2026-01-15T10:01:00.000Z');
  await deliverInAppToInbox(outbox, { channel: 'in_app', targetId: 't1', targetKind: 'in_app_user', addressJson: '{}', payload: { title: 'h', body: 'b', decisionId: 'd1', ruleKey: 'critical_drift', asset: 'XAU/USD', timeframe: 'H1', createdAt: '2026-01-15T10:00:00.000Z' } }, { inboxRepository }, '2026-01-15T10:01:00.000Z');
  assert((await inboxRepository.listInboxForTarget('t1')).length === 1, 'inbox delivery is idempotent');
}
