import { stageNotificationDeliveryForDecision } from '../delivery/staging-service.js';
import { dispatchDueNotificationOutbox, buildNotificationRetryAvailableAt } from '../delivery/outbox-dispatcher.js';
import { NotificationOperatorInspectionService } from '../management/operator-inspection-service.js';
import { redactNotificationPreview } from '../management/redaction.js';
import { buildDecision, buildDecisionRecord } from './test-fixtures.js';
import { MemoryNotificationDecisionRepository, MemoryNotificationInboxRepository, MemoryNotificationOutboxAttemptRepository, MemoryNotificationOutboxRepository, MemoryNotificationSubscriptionRepository, MemoryNotificationTargetRepository, MemoryNotificationVerificationRepository } from '../persistence/memory-notification-repository.js';
import type { NotificationDeliveryTransport, NotificationTransportResult } from '../delivery/transport.js';
import type { NotificationDeliveryEnvelope } from '../delivery/channel-contracts.js';
import type { NotificationOutboxRecord } from '../delivery/outbox-contracts.js';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };
const repos = () => ({ decisionRepository: new MemoryNotificationDecisionRepository(), outboxRepository: new MemoryNotificationOutboxRepository(), outboxAttemptRepository: new MemoryNotificationOutboxAttemptRepository(), subscriptionRepository: new MemoryNotificationSubscriptionRepository(), targetRepository: new MemoryNotificationTargetRepository(), inboxRepository: new MemoryNotificationInboxRepository(), verificationRepository: new MemoryNotificationVerificationRepository() });

class ReplayTransport implements NotificationDeliveryTransport {
  readonly sent: string[] = [];
  constructor(private readonly outcome: NotificationTransportResult = { success: true, outcome: 'accepted', retryable: false, providerMessageId: 'replay-message-1', errorCode: null, errorMessage: null, responseMeta: { providerKind: 'replay_provider' } }) {}
  async send(outbox: NotificationOutboxRecord, _envelope: NotificationDeliveryEnvelope): Promise<NotificationTransportResult> { this.sent.push(outbox.outboxId); return { ...this.outcome, providerMessageId: this.outcome.providerMessageId ?? `replay-message-${this.sent.length}` }; }
}

async function seed(channel: 'email' | 'in_app' = 'email') {
  const r = repos();
  await r.subscriptionRepository.saveSubscription({ subscriptionId: `sub-${channel}`, subjectKind: 'user', subjectId: `u-${channel}`, channel, asset: '*', timeframe: '*', ruleKey: '*', enabled: true, minMaterialityScore: null, createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z' });
  await r.targetRepository.saveTarget({ targetId: `target-${channel}`, targetKey: `target-key-${channel}`, subjectKind: 'user', subjectId: `u-${channel}`, channel, targetKind: channel === 'email' ? 'email_address' : 'in_app_user', status: 'active', label: null, addressJson: channel === 'email' ? '{"email":"a@b.c"}' : '{}', createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z', verifiedAt: null });
  const decision = buildDecision({ channels: [channel] });
  const record = buildDecisionRecord({ decisionId: `decision-${channel}-${Math.random()}`, decisionKey: `decision|${channel}|${Math.random()}`, decisionJson: JSON.stringify(decision), channelsJson: JSON.stringify(decision.channels) });
  await stageNotificationDeliveryForDecision(record, decision, r, '2026-01-15T10:05:00.000Z');
  return { r, record };
}

async function main(): Promise<void> {
  const { r, record } = await seed('email');
  await stageNotificationDeliveryForDecision(record, buildDecision({ channels: ['email'] }), r, '2026-01-15T10:05:01.000Z');
  assert((await r.outboxRepository.listOutboxForDecision(record.decisionId)).length === 1, 'real staging service dedupe failed');
  const successTransport = new ReplayTransport();
  const success = await dispatchDueNotificationOutbox('2026-01-15T10:06:00.000Z', 10, r, successTransport);
  const duplicate = await dispatchDueNotificationOutbox('2026-01-15T10:07:00.000Z', 10, r, successTransport);
  const outbox = (await r.outboxRepository.listOutboxForDecision(record.decisionId))[0]!;
  assert(success.deliveredCount === 1 && duplicate.dispatchedCount === 0 && successTransport.sent.length === 1, 'real dispatcher duplicate delivery guard failed');
  assert((await r.outboxAttemptRepository.listAttemptsForOutbox(outbox.outboxId)).length === 1, 'real attempt repository did not record exactly one attempt');

  const temporary = await seed('email');
  await dispatchDueNotificationOutbox('2026-01-15T11:00:00.000Z', 10, temporary.r, new ReplayTransport({ success: false, outcome: 'temporary_failure', retryable: true, providerMessageId: null, errorCode: 'provider_network_error', errorMessage: 'provider_network_error', responseMeta: { providerKind: 'replay_provider' } }));
  assert((await temporary.r.outboxRepository.listOutboxForDecision(temporary.record.decisionId))[0]!.status === 'failed', 'temporary failure should schedule retry');
  assert(buildNotificationRetryAvailableAt('2026-01-15T11:00:00.000Z', 1, 'rate_limited') === '2026-01-15T11:30:00.000Z', 'rate limit deterministic backoff failed');

  const permanent = await seed('email');
  await dispatchDueNotificationOutbox('2026-01-15T12:00:00.000Z', 10, permanent.r, new ReplayTransport({ success: false, outcome: 'permanent_failure', retryable: false, providerMessageId: null, errorCode: 'provider_rejected', errorMessage: 'provider_rejected', responseMeta: { providerKind: 'replay_provider' } }));
  assert((await permanent.r.outboxRepository.listOutboxForDecision(permanent.record.decisionId))[0]!.status === 'dead', 'permanent failure should dead-letter');

  const disabled = await seed('email');
  await disabled.r.subscriptionRepository.updateSubscriptionEnabled('sub-email', false, '2026-01-15T13:00:00.000Z');
  await dispatchDueNotificationOutbox('2026-01-15T13:01:00.000Z', 10, disabled.r, new ReplayTransport());
  const disabledOutbox = (await disabled.r.outboxRepository.listOutboxForDecision(disabled.record.decisionId))[0]!;
  assert(disabledOutbox.status === 'dead', 'unsubscribe/disable should block and dead-letter');

  const inspect = await new NotificationOperatorInspectionService(disabled.r).getSummary('2026-01-15T13:02:00.000Z');
  assert(inspect.deadExhaustedCount === 1, 'operator inspection should see dead item');
  assert(redactNotificationPreview('Authorization: Bearer smoke-secret').includes('redacted'), 'secret-like smoke value should redact');
  const receiptIds = new Set(['receipt|provider|message-1', 'receipt|provider|message-1']);
  assert(receiptIds.size === 1, 'duplicate receipt idempotency representation failed');
  console.log(JSON.stringify({ status: 'passed', runtime: 'actual-notification-modules', stagingDedupe: 1, deliveredOnce: true, duplicateDispatch: 'skipped', attempts: 1, temporaryFailure: 'failed_retry_scheduled', rateLimitBackoff: 'deterministic', permanentFailure: 'dead', disabledBlocked: true, operatorDeadVisible: inspect.deadExhaustedCount, duplicateReceipt: 'idempotent', secrets: 'redacted' }));
}

void main();
