import { strict as assert } from 'node:assert';
import { normalizeHttpEmailProviderEvent, normalizePushProviderEvent, normalizeUnknownProviderEvent } from '../feedback/normalizers.js';
import { buildNotificationDeliveryReceipt } from '../feedback/receipt-builder.js';
import { applyReceiptToTargetHealth } from '../feedback/target-health.js';
import { processProviderEvent } from '../feedback/feedback-service.js';
import { MemoryNotificationDecisionRepository, MemoryNotificationDeliveryReceiptRepository, MemoryNotificationOutboxAttemptRepository, MemoryNotificationOutboxRepository, MemoryNotificationProviderEventRepository, MemoryNotificationTargetHealthRepository, MemoryNotificationTargetRepository } from '../persistence/memory-notification-repository.js';

export async function runNotificationFeedbackRuntimeTests(): Promise<void> {
  const delivered = normalizeHttpEmailProviderEvent({ eventId: 'evt-1', status: 'delivered', messageId: 'msg-1', occurredAt: '2026-01-10T00:00:00.000Z' }, 'http_email');
  assert.equal(delivered.eventKind, 'delivered');
  assert.equal(delivered.providerMessageId, 'msg-1');
  assert.equal(normalizeHttpEmailProviderEvent({ eventId: 'evt-delay', status: 'delayed' }, 'resend').eventKind, 'delivery_delayed');
  assert.equal(normalizeHttpEmailProviderEvent({ eventId: 'evt-failed', status: 'failed' }, 'resend').eventKind, 'provider_failed');

  const bounced = normalizeHttpEmailProviderEvent({ eventId: 'evt-2', status: 'bounced', reasonCode: 'hard_bounce', reason: 'mailbox not found' }, 'http_email');
  assert.equal(bounced.eventKind, 'bounced');

  const unknown = normalizeUnknownProviderEvent({ payload: true }, 'x', 'email');
  assert.equal(unknown.eventKind, 'unknown');

  const invalidPush = normalizePushProviderEvent({ eventId: 'p-1', code: 'invalid_endpoint' }, 'web_push');
  assert.equal(invalidPush.eventKind, 'invalid_target');

  const receipt = buildNotificationDeliveryReceipt(delivered, { outboxId: 'outbox-1', attemptId: 'attempt-1', decisionId: 'decision-1', decisionKey: 'decision-key', targetId: 'target-1', subjectKind: 'user', subjectId: 'u-1' }, '2026-01-10T00:01:00.000Z');
  assert.equal(receipt.severity, 'info');
  assert.equal(receipt.receiptId, 'receipt|http_email|evt-1');

  const bounceHealth1 = applyReceiptToTargetHealth(null, { ...receipt, eventKind: 'bounced', severity: 'warning' }, { targetId: 'target-1', subjectKind: 'user', subjectId: 'u-1', channel: 'email', targetKind: 'email_address', status: 'active', label: null, addressJson: '{}', createdAt: '2026-01-10T00:00:00.000Z', updatedAt: '2026-01-10T00:00:00.000Z', verifiedAt: null }, '2026-01-10T00:02:00.000Z');
  assert.equal(bounceHealth1.healthRecord.healthState, 'warning');
  const bounceHealth3 = applyReceiptToTargetHealth({ ...bounceHealth1.healthRecord, hardFailureCount: 2 }, { ...receipt, eventKind: 'bounced', severity: 'warning' }, { targetId: 'target-1', subjectKind: 'user', subjectId: 'u-1', channel: 'email', targetKind: 'email_address', status: 'active', label: null, addressJson: '{}', createdAt: '2026-01-10T00:00:00.000Z', updatedAt: '2026-01-10T00:00:00.000Z', verifiedAt: null }, '2026-01-10T00:03:00.000Z');
  assert.equal(bounceHealth3.healthRecord.healthState, 'disabled');
  const olderDelivered = applyReceiptToTargetHealth(bounceHealth3.healthRecord, { ...receipt, eventKind: 'delivered', occurredAt: '2026-01-09T00:00:00.000Z' }, null, '2026-01-10T00:05:00.000Z');
  assert.equal(olderDelivered.healthRecord.lastReceiptKind, 'bounced');
  assert.equal(olderDelivered.healthRecord.healthState, 'disabled');
  const delayedHealth = applyReceiptToTargetHealth(null, { ...receipt, eventKind: 'delivery_delayed', severity: 'warning' }, null, '2026-01-10T00:02:00.000Z');
  assert.equal(delayedHealth.healthRecord.healthState, 'healthy');

  const targetRepository = new MemoryNotificationTargetRepository();
  await targetRepository.saveTarget({ targetId: 'target-1', subjectKind: 'user', subjectId: 'u-1', channel: 'email', targetKind: 'email_address', status: 'active', label: null, addressJson: '{}', createdAt: '2026-01-10T00:00:00.000Z', updatedAt: '2026-01-10T00:00:00.000Z', verifiedAt: '2026-01-10T00:00:00.000Z' });

  const outboxRepository = new MemoryNotificationOutboxRepository();
  await outboxRepository.stageOutbox({ outboxId: 'outbox-1', outboxKey: 'outbox-key', decisionId: 'decision-1', decisionKey: 'decision-key', asset: 'EUR/USD', timeframe: 'H1', ruleKey: 'critical_drift', channel: 'email', targetId: 'target-1', subjectKind: 'user', subjectId: 'u-1', targetKey: 'target-key', deliveryAddressJson: '{}', status: 'staged', availableAt: '2026-01-10T00:00:00.000Z', lastAttemptAt: null, deliveredAt: null, deadAt: null, attemptCount: 0, lastErrorCode: null, lastErrorMessage: null, payloadJson: '{}', createdAt: '2026-01-10T00:00:00.000Z', updatedAt: '2026-01-10T00:00:00.000Z' });

  const outboxAttemptRepository = new MemoryNotificationOutboxAttemptRepository();
  await outboxAttemptRepository.saveAttempt({ attemptId: 'attempt|outbox-1|1|2026-01-10T00:00:00.000Z', outboxId: 'outbox-1', channel: 'email', attemptedAt: '2026-01-10T00:00:00.000Z', status: 'success', errorCode: null, errorMessage: null, providerKind: 'http_email', providerMessageId: 'msg-1', receiptStatus: 'accepted', responseMetaJson: '{}' });

  const result = await processProviderEvent({ providerKind: 'http_email', channel: 'email', rawEvent: { eventId: 'evt-1', status: 'complained', messageId: 'msg-1', occurredAt: '2026-01-10T00:04:00.000Z' } }, {
    providerEventRepository: new MemoryNotificationProviderEventRepository(),
    receiptRepository: new MemoryNotificationDeliveryReceiptRepository(),
    targetHealthRepository: new MemoryNotificationTargetHealthRepository(targetRepository),
    targetRepository,
    outboxRepository,
    outboxAttemptRepository,
    decisionRepository: new MemoryNotificationDecisionRepository()
  });
  assert.equal(result.eventKind, 'complained');
  assert.equal(result.targetDisabled, true);

  const uncorrelated = await processProviderEvent({ providerKind: 'http_email', channel: 'email', rawEvent: { eventId: 'evt-uncorr', status: 'delivered', messageId: 'missing' } }, {
    providerEventRepository: new MemoryNotificationProviderEventRepository(),
    receiptRepository: new MemoryNotificationDeliveryReceiptRepository(),
    targetHealthRepository: new MemoryNotificationTargetHealthRepository(targetRepository),
    targetRepository,
    outboxRepository: new MemoryNotificationOutboxRepository(),
    outboxAttemptRepository: new MemoryNotificationOutboxAttemptRepository(),
    decisionRepository: new MemoryNotificationDecisionRepository()
  });
  assert.equal(uncorrelated.correlated, false);
}
