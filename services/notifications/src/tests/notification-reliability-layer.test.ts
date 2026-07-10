import { dispatchDueNotificationOutbox, buildNotificationRetryAvailableAt } from '../delivery/outbox-dispatcher.js';
import { createNotificationDeliveryTransport } from '../delivery/transport.js';
import { NotificationOperatorInspectionService } from '../management/operator-inspection-service.js';
import { redactNotificationPreview } from '../management/redaction.js';
import { getNotificationProviderMode, assertNotificationProviderModeAllowed } from '../providers/modes.js';
import { stageNotificationDeliveryForDecision } from '../delivery/staging-service.js';
import { buildDecision, buildDecisionRecord } from './test-fixtures.js';
import { MemoryNotificationDecisionRepository, MemoryNotificationInboxRepository, MemoryNotificationOutboxAttemptRepository, MemoryNotificationOutboxRepository, MemoryNotificationSubscriptionRepository, MemoryNotificationTargetRepository, MemoryNotificationVerificationRepository } from '../persistence/memory-notification-repository.js';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

function repos() { return { decisionRepository: new MemoryNotificationDecisionRepository(), outboxRepository: new MemoryNotificationOutboxRepository(), outboxAttemptRepository: new MemoryNotificationOutboxAttemptRepository(), subscriptionRepository: new MemoryNotificationSubscriptionRepository(), targetRepository: new MemoryNotificationTargetRepository(), inboxRepository: new MemoryNotificationInboxRepository(), verificationRepository: new MemoryNotificationVerificationRepository() }; }

export async function runNotificationReliabilityLayerTests(): Promise<void> {
  assert(getNotificationProviderMode({}) === 'local_fake_provider', 'default provider mode must be safe local fake');
  let blocked = false;
  try { assertNotificationProviderModeAllowed({ NOTIFICATION_PROVIDER_MODE: 'production_provider' }); } catch { blocked = true; }
  assert(blocked, 'production notification provider must be blocked');
  assert(buildNotificationRetryAvailableAt('2026-01-15T10:00:00.000Z', 2, 'rate_limited') === '2026-01-15T11:00:00.000Z', 'rate limit backoff should be deterministic');
  assert(redactNotificationPreview('Authorization: Bearer secret-token') !== 'Authorization: Bearer secret-token', 'secret-like values should redact');

  const r = repos();
  await r.subscriptionRepository.saveSubscription({ subscriptionId: 'sub', subjectKind: 'user', subjectId: 'u', channel: 'email', asset: '*', timeframe: '*', ruleKey: '*', enabled: true, minMaterialityScore: null, createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z' });
  await r.targetRepository.saveTarget({ targetId: 'target', targetKey: 'target-key', subjectKind: 'user', subjectId: 'u', channel: 'email', targetKind: 'email_address', status: 'active', label: null, addressJson: '{"email":"a@b.c"}', createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z', verifiedAt: null });
  const decision = buildDecision({ channels: ['email'] });
  const record = buildDecisionRecord({ decisionJson: JSON.stringify(decision), channelsJson: JSON.stringify(decision.channels) });
  await Promise.all([stageNotificationDeliveryForDecision(record, decision, r, '2026-01-15T10:05:00.000Z'), stageNotificationDeliveryForDecision(record, decision, r, '2026-01-15T10:05:00.000Z')]);
  assert((await r.outboxRepository.listOutboxForDecision(record.decisionId)).length === 1, 'concurrent duplicate staging should dedupe by outbox key');

  await r.subscriptionRepository.updateSubscriptionEnabled('sub', false, '2026-01-15T10:05:30.000Z');
  const blockedReport = await dispatchDueNotificationOutbox('2026-01-15T10:06:00.000Z', 10, r, createNotificationDeliveryTransport({}, { inboxRepository: r.inboxRepository }));
  assert(blockedReport.deadCount === 1 && blockedReport.reports[0]?.errorCode === 'unsubscribed_or_disabled', 'channel preference disable should block and dead-letter dispatch');
  const outbox = (await r.outboxRepository.listOutboxForDecision(record.decisionId))[0];
  assert(Boolean(outbox), 'outbox should exist');
  const attempts = await r.outboxAttemptRepository.listAttemptsForOutbox(outbox!.outboxId);
  assert(attempts.length === 1 && attempts[0]?.receiptStatus === 'unsubscribed_or_disabled', 'blocked dispatch should be operator-visible in attempts');
  const inspection = await new NotificationOperatorInspectionService(r).getSummary('2026-01-15T10:07:00.000Z');
  assert(inspection.deadExhaustedCount === 1 && inspection.recentDeadLetterItems.length === 1, 'operator inspection should expose dead letters');
}
