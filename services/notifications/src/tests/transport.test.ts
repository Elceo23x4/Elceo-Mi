import { createNotificationDeliveryTransport } from '../delivery/transport.js';
import { MemoryNotificationInboxRepository } from '../persistence/memory-notification-repository.js';
import type { NotificationOutboxRecord } from '../delivery/outbox-contracts.js';
import { ResendEmailDeliveryTransport } from '../providers/production-transports.js';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

const outbox: NotificationOutboxRecord = {
  outboxId: 'o1', outboxKey: 'o1', decisionId: 'd1', decisionKey: 'k1', asset: 'XAU/USD', timeframe: 'H1', ruleKey: 'critical_drift', channel: 'in_app',
  targetId: 't1', subjectKind: 'user', subjectId: 'u1', targetKey: 'target|t1', deliveryAddressJson: '{}', status: 'staged', availableAt: '2026-01-15T10:00:00.000Z', lastAttemptAt: null, deliveredAt: null, deadAt: null, attemptCount: 0, lastErrorCode: null, lastErrorMessage: null, payloadJson: '{}', createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z'
};

export async function runTransportTests(): Promise<void> {
  const inboxRepository = new MemoryNotificationInboxRepository();
  const transport = createNotificationDeliveryTransport({}, { inboxRepository });
  const success = await transport.send(outbox, { channel: 'in_app', targetId: 't1', targetKind: 'in_app_user', addressJson: '{}', payload: { title: 't', body: 'b', decisionId: 'd1', ruleKey: 'critical_drift', asset: 'XAU/USD', timeframe: 'H1', createdAt: '2026-01-15T10:00:00.000Z' } }, '2026-01-15T10:01:00.000Z');
  assert(success.success === true, 'in_app transport should persist inbox');

  const failing = createNotificationDeliveryTransport({}, { inboxRepository, memoryFailureByChannel: { email: { errorCode: 'provider_not_configured', errorMessage: 'forced_failure' } } });
  const failure = await failing.send({ ...outbox, channel: 'email', targetId: 't2' }, { channel: 'email', targetId: 't2', targetKind: 'email_address', addressJson: '{}', payload: { subject: 's', body: 'b', decisionId: 'd1', ruleKey: 'critical_drift', asset: 'XAU/USD', timeframe: 'H1', createdAt: '2026-01-15T10:00:00.000Z' } }, '2026-01-15T10:01:00.000Z');
  assert(failure.success === false && failure.errorCode === 'provider_not_configured', 'memory email transport supports deterministic failure injection');

  const envelope = { channel: 'email' as const, targetId: 't2', targetKind: 'email_address' as const, addressJson: '{"email":"safe@example.test"}', payload: { subject: 's', body: 'b', decisionId: 'd1', ruleKey: 'critical_drift', asset: 'XAU/USD' as const, timeframe: 'H1' as const, createdAt: '2026-01-15T10:00:00.000Z' } };
  const resendCase = async (status: number, name: string) => new ResendEmailDeliveryTransport('secret','from@example.test',null,null,1000,async () => new Response(JSON.stringify({ name }), { status })).send({ ...outbox, channel:'email' }, envelope);
  const invalidKey = await resendCase(400, 'invalid_idempotency_key');
  assert(invalidKey.retryable === false && invalidKey.errorCode === 'invalid_idempotency_key', 'invalid idempotency key is permanent');
  const mismatch = await resendCase(409, 'invalid_idempotent_request');
  assert(mismatch.retryable === false && mismatch.errorCode === 'invalid_idempotent_request', 'same key payload mismatch is permanent');
  const concurrent = await resendCase(409, 'concurrent_idempotent_requests');
  assert(concurrent.retryable === true && concurrent.errorCode === 'concurrent_idempotent_requests', 'concurrent same-key request is retryable');
}
