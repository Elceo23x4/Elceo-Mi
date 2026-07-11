import { readFileSync } from 'node:fs';
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
  const replaySmokeScript = readFileSync('../../scripts/notification-replay-smoke.mjs', 'utf8');
  assert(replaySmokeScript.includes('notification-replay-smoke-runner.js') && !replaySmokeScript.includes('const outbox = new Map()'), 'replay smoke should invoke actual notification runtime runner');
  const sandboxSmokeScript = readFileSync('../../scripts/notification-sandbox-smoke.mjs', 'utf8');
  assert(!sandboxSmokeScript.includes("status: 'ready'") && !sandboxSmokeScript.includes('status":"ready'), 'sandbox smoke must never print ready as success');

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

export async function runNotificationReliabilitySurgicalTests(): Promise<void> {
  const r = repos();
  await r.subscriptionRepository.saveSubscription({ subscriptionId: 'sub-concurrent', subjectKind: 'user', subjectId: 'u-concurrent', channel: 'email', asset: '*', timeframe: '*', ruleKey: '*', enabled: true, minMaterialityScore: null, createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z' });
  await r.targetRepository.saveTarget({ targetId: 'target-concurrent', targetKey: 'target-concurrent-key', subjectKind: 'user', subjectId: 'u-concurrent', channel: 'email', targetKind: 'email_address', status: 'active', label: null, addressJson: '{"email":"a@b.c"}', createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z', verifiedAt: null });
  const decision = buildDecision({ channels: ['email'] });
  const record = buildDecisionRecord({ decisionId: 'decision-concurrent', decisionKey: 'decision|concurrent', decisionJson: JSON.stringify(decision), channelsJson: JSON.stringify(decision.channels) });
  await stageNotificationDeliveryForDecision(record, decision, r, '2026-01-15T10:05:00.000Z');
  let sendCount = 0;
  const transport = { async send() { sendCount += 1; return { success: true, outcome: 'accepted' as const, retryable: false, providerMessageId: `provider-${sendCount}`, errorCode: null, errorMessage: null, responseMeta: { providerKind: 'replay' } }; } };
  const [left, right] = await Promise.all([
    dispatchDueNotificationOutbox('2026-01-15T10:06:00.000Z', 10, r, transport),
    dispatchDueNotificationOutbox('2026-01-15T10:06:00.000Z', 10, r, transport)
  ]);
  assert(sendCount === 1, 'atomic claim should allow only one concurrent send');
  assert(left.dispatchedCount + right.dispatchedCount === 1, 'only one concurrent worker should dispatch');
  const outbox = (await r.outboxRepository.listOutboxForDecision(record.decisionId))[0]!;
  assert((await r.outboxAttemptRepository.listAttemptsForOutbox(outbox.outboxId)).length === 1, 'attempt record should be created once per claimed dispatch');
  assert((await r.outboxRepository.claimDueOutboxItem(outbox.outboxId, '2026-01-15T10:07:00.000Z')) === null, 'delivered item should not be claimed again');

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('auth secret body', { status: 401 }) as never;
    const authTransport = createNotificationDeliveryTransport({ NOTIFICATION_PROVIDER_MODE: 'sandbox_provider', ELCEO_NOTIFICATION_SANDBOX_SMOKE: '1', NOTIFICATION_EMAIL_PROVIDER: 'http_email', NOTIFICATION_HTTP_EMAIL_ENDPOINT: 'https://provider.invalid', NOTIFICATION_HTTP_EMAIL_API_KEY: 'secret', NOTIFICATION_EMAIL_FROM_ADDRESS: 'sender@example.test' }, { inboxRepository: r.inboxRepository });
    const authResult = await authTransport.send(outbox, { channel: 'email', targetId: outbox.targetId, targetKind: 'email_address', addressJson: '{"email":"a@b.c"}', payload: { decisionId: outbox.decisionId, asset: outbox.asset, timeframe: outbox.timeframe, ruleKey: outbox.ruleKey, subject: 'h', body: 'b', createdAt: outbox.createdAt } }, '2026-01-15T10:08:00.000Z');
    assert(authResult.outcome === 'permanent_failure' && authResult.retryable === false && authResult.errorCode === 'provider_auth_failed', 'provider auth failure should be terminal');
    assert(!JSON.stringify(authResult.responseMeta).includes('auth secret body'), 'provider failure metadata should be redacted');
    globalThis.fetch = async () => new Response('rate body', { status: 429 }) as never;
    const rateResult = await authTransport.send(outbox, { channel: 'email', targetId: outbox.targetId, targetKind: 'email_address', addressJson: '{"email":"a@b.c"}', payload: { decisionId: outbox.decisionId, asset: outbox.asset, timeframe: outbox.timeframe, ruleKey: outbox.ruleKey, subject: 'h', body: 'b', createdAt: outbox.createdAt } }, '2026-01-15T10:09:00.000Z');
    assert(rateResult.outcome === 'rate_limited' && rateResult.retryable === true, 'rate limit should be retryable');
    globalThis.fetch = async () => { throw new Error('timeout'); };
    const timeoutResult = await authTransport.send(outbox, { channel: 'email', targetId: outbox.targetId, targetKind: 'email_address', addressJson: '{"email":"a@b.c"}', payload: { decisionId: outbox.decisionId, asset: outbox.asset, timeframe: outbox.timeframe, ruleKey: outbox.ruleKey, subject: 'h', body: 'b', createdAt: outbox.createdAt } }, '2026-01-15T10:10:00.000Z');
    assert(timeoutResult.outcome === 'provider_timeout' && timeoutResult.retryable === true, 'timeout should be retryable and visible');
  } finally {
    globalThis.fetch = originalFetch;
  }

  const inspectionRepos = repos();
  const now = '2026-01-15T11:00:00.000Z';
  await inspectionRepos.outboxRepository.stageOutbox({ ...outbox, outboxId: 'inspect-staged', outboxKey: 'inspect-staged', status: 'staged', createdAt: now, updatedAt: now, availableAt: now, deliveredAt: null, deadAt: null, attemptCount: 0 });
  await inspectionRepos.outboxRepository.stageOutbox({ ...outbox, outboxId: 'inspect-failed', outboxKey: 'inspect-failed', status: 'failed', createdAt: now, updatedAt: now, availableAt: now, deliveredAt: null, deadAt: null, lastErrorCode: 'provider_timeout', lastErrorMessage: 'provider_timeout', attemptCount: 1 });
  await inspectionRepos.outboxRepository.stageOutbox({ ...outbox, outboxId: 'inspect-dead', outboxKey: 'inspect-dead', status: 'dead', createdAt: now, updatedAt: now, availableAt: now, deliveredAt: null, deadAt: now, lastErrorCode: 'invalid_target', lastErrorMessage: 'invalid_target', attemptCount: 1 });
  await inspectionRepos.outboxRepository.stageOutbox({ ...outbox, outboxId: 'inspect-dispatching', outboxKey: 'inspect-dispatching', status: 'staged', createdAt: now, updatedAt: now, availableAt: now, deliveredAt: null, deadAt: null, attemptCount: 0 });
  await inspectionRepos.outboxRepository.claimDueOutboxItem('inspect-dispatching', now);
  const summary = await new NotificationOperatorInspectionService(inspectionRepos).getSummary(now);
  assert(summary.pendingStagedCount === 1 && summary.failedRetryableCount === 1 && summary.deadExhaustedCount === 1 && summary.dispatchingCount === 1, 'operator inspection should expose staged failed dead and stale dispatching states');
}
