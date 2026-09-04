import { buildNotificationRetryAvailableAt, dispatchDueNotificationOutbox } from '../delivery/outbox-dispatcher.js';
import { buildDecision, buildDecisionRecord } from './test-fixtures.js';
import {
  MemoryNotificationDecisionRepository,
  MemoryNotificationInboxRepository,
  MemoryNotificationOutboxAttemptRepository,
  MemoryNotificationOutboxRepository,
  MemoryNotificationSubscriptionRepository,
  MemoryNotificationTargetRepository,
  MemoryNotificationVerificationRepository
} from '../persistence/memory-notification-repository.js';
import { stageNotificationDeliveryForDecision } from '../delivery/staging-service.js';
import { createNotificationDeliveryTransport } from '../delivery/transport.js';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

function buildRepos() {
  return {
    decisionRepository: new MemoryNotificationDecisionRepository(),
    outboxRepository: new MemoryNotificationOutboxRepository(),
    outboxAttemptRepository: new MemoryNotificationOutboxAttemptRepository(),
    subscriptionRepository: new MemoryNotificationSubscriptionRepository(),
    targetRepository: new MemoryNotificationTargetRepository(),
    inboxRepository: new MemoryNotificationInboxRepository(),
    verificationRepository: new MemoryNotificationVerificationRepository()
  };
}

export async function runOutboxDispatcherTests(): Promise<void> {
  const start = '2026-01-01T00:00:00.000Z';
  const ordinaryHorizon = [1,2,3,4].reduce((at, attempt) => buildNotificationRetryAvailableAt(at, attempt), start);
  const rateLimitedHorizon = [1,2,3,4].reduce((at, attempt) => buildNotificationRetryAvailableAt(at, attempt, 'rate_limited'), start);
  assert((Date.parse(ordinaryHorizon) - Date.parse(start)) / 60_000 === 75, 'ordinary fifth-attempt horizon must remain 75 minutes');
  assert((Date.parse(rateLimitedHorizon) - Date.parse(start)) / 60_000 === 450, 'rate-limited fifth-attempt horizon must remain 450 minutes');
  const repos = buildRepos();
  await repos.subscriptionRepository.saveSubscription({ subscriptionId: 'sub-1', subjectKind: 'user', subjectId: 'u-1', channel: 'in_app', asset: '*', timeframe: '*', ruleKey: '*', enabled: true, minMaterialityScore: null, createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z' });
  await repos.targetRepository.saveTarget({ targetId: 'target-1', subjectKind: 'user', subjectId: 'u-1', channel: 'in_app', targetKind: 'in_app_user', status: 'active', label: null, addressJson: '{}', createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z', verifiedAt: null });
  const decision = buildDecision({ channels: ['in_app'] });
  const record = buildDecisionRecord({ decisionJson: JSON.stringify(decision), channelsJson: JSON.stringify(decision.channels) });
  await stageNotificationDeliveryForDecision(record, decision, repos, '2026-01-15T10:05:00.000Z');
  await repos.targetRepository.updateTargetStatus('target-hard', 'disabled', '2026-01-15T10:05:30.000Z');

  const successTransport = createNotificationDeliveryTransport({}, { inboxRepository: repos.inboxRepository });
  const successReport = await dispatchDueNotificationOutbox('2026-01-15T10:06:00.000Z', 10, repos, successTransport);
  assert(successReport.deliveredCount === 1, 'in_app dispatch should deliver and persist inbox');
  assert((await repos.inboxRepository.listInboxForDecision(record.decisionId)).length === 1, 'inbox row should be created');

  const retryRepos = buildRepos();
  await retryRepos.subscriptionRepository.saveSubscription({ subscriptionId: 'sub-2', subjectKind: 'user', subjectId: 'u-2', channel: 'email', asset: '*', timeframe: '*', ruleKey: '*', enabled: true, minMaterialityScore: null, createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z' });
  await retryRepos.targetRepository.saveTarget({ targetId: 'target-2', subjectKind: 'user', subjectId: 'u-2', channel: 'email', targetKind: 'email_address', status: 'active', label: null, addressJson: '{"email":"a@b.c"}', createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z', verifiedAt: null });
  const emailDecision = buildDecision({ channels: ['email'] });
  const emailRecord = buildDecisionRecord({ decisionId: 'decision-2', decisionKey: 'decision|2', decisionJson: JSON.stringify(emailDecision), channelsJson: JSON.stringify(emailDecision.channels) });
  await stageNotificationDeliveryForDecision(emailRecord, emailDecision, retryRepos, '2026-01-15T11:00:00.000Z');
  const failingTransport = createNotificationDeliveryTransport({}, { inboxRepository: retryRepos.inboxRepository, memoryFailureByChannel: { email: { errorCode: 'provider_not_configured', errorMessage: 'x' } } });

  await dispatchDueNotificationOutbox('2026-01-15T11:00:00.000Z', 10, retryRepos, failingTransport);
  await dispatchDueNotificationOutbox('2026-01-15T12:30:00.000Z', 10, retryRepos, failingTransport);
  await dispatchDueNotificationOutbox('2026-01-15T13:30:00.000Z', 10, retryRepos, failingTransport);
  await dispatchDueNotificationOutbox('2026-01-15T14:30:00.000Z', 10, retryRepos, failingTransport);
  await dispatchDueNotificationOutbox('2026-01-15T15:30:00.000Z', 10, retryRepos, failingTransport);
  assert((await retryRepos.outboxRepository.listOutboxForDecision(emailRecord.decisionId)).every((item) => item.status === 'dead'), 'fifth failure should mark dead');
}


export async function runOutboxDispatcherHardeningTests(): Promise<void> {
  const repos = buildRepos();
  await repos.subscriptionRepository.saveSubscription({ subscriptionId: 'sub-hard', subjectKind: 'user', subjectId: 'u-hard', channel: 'email', asset: '*', timeframe: '*', ruleKey: '*', enabled: true, minMaterialityScore: null, createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z' });
  await repos.targetRepository.saveTarget({ targetId: 'target-hard', subjectKind: 'user', subjectId: 'u-hard', channel: 'email', targetKind: 'email_address', status: 'active', label: null, addressJson: '{"email":"a@b.c"}', createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z', verifiedAt: '2026-01-15T10:00:00.000Z' });
  const decision = buildDecision({ channels: ['email'] });
  const record = buildDecisionRecord({ decisionId: 'decision-hard', decisionKey: 'decision|hard', decisionJson: JSON.stringify(decision), channelsJson: JSON.stringify(decision.channels) });
  await stageNotificationDeliveryForDecision(record, decision, repos, '2026-01-15T10:05:00.000Z');
  await repos.targetRepository.updateTargetStatus('target-hard', 'disabled', '2026-01-15T10:05:30.000Z');
  const report = await dispatchDueNotificationOutbox('2026-01-15T10:06:00.000Z', 10, repos, createNotificationDeliveryTransport({}, { inboxRepository: repos.inboxRepository }));
  assert(report.reports[0]?.errorCode === 'target_not_active', 'inactive target should map to target_not_active');
}
