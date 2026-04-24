import { createNotificationDeliveryTransport } from '../delivery/transport.js';
import {
  MemoryNotificationDecisionRepository,
  MemoryNotificationInboxRepository,
  MemoryNotificationOrchestrationRunRepository,
  MemoryNotificationOutboxAttemptRepository,
  MemoryNotificationOutboxRepository,
  MemoryNotificationSubscriptionRepository,
  MemoryNotificationTargetRepository,
  MemoryNotificationVerificationRepository
} from '../persistence/memory-notification-repository.js';
import { deserializeNotificationOrchestrationRunReport } from '../persistence/serialization.js';
import { getNotificationOrchestrationReplayById } from '../persistence/replay.js';
import { runNotificationDispatchJob } from '../orchestration/dispatch-job.js';
import { runNotificationEndToEndForReasoningRun } from '../orchestration/end-to-end-service.js';
import { listPendingVerificationsNearExpiry, listStuckDispatchingOutbox, summarizeNotificationRuntimeHealth } from '../orchestration/maintenance.js';
import { stageDeliveriesForReasoningRun } from '../orchestration/staging-aggregator.js';
import { runNotificationVerificationExpiryJob } from '../orchestration/verification-expiry-job.js';
import { CanonicalNotificationOrchestrationBoundaryService } from '../runtime/canonical-notification-orchestration-boundary.js';
import { buildDecision, buildDecisionRecord, buildReasoningRun, buildSnapshot } from './test-fixtures.js';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

function buildRuntimeDeps() {
  const decisionRepository = new MemoryNotificationDecisionRepository();
  const outboxRepository = new MemoryNotificationOutboxRepository();
  const outboxAttemptRepository = new MemoryNotificationOutboxAttemptRepository();
  const targetRepository = new MemoryNotificationTargetRepository();
  const subscriptionRepository = new MemoryNotificationSubscriptionRepository();
  const inboxRepository = new MemoryNotificationInboxRepository();
  const verificationRepository = new MemoryNotificationVerificationRepository();
  const orchestrationRunRepository = new MemoryNotificationOrchestrationRunRepository();

  const run = buildReasoningRun({ reasoningRunId: 'run-orch', snapshotId: 'snap-orch', status: 'success' });
  const snapshot = buildSnapshot('snap-orch', 'run-orch', '2026-01-15T10:00:00.000Z');

  return {
    decisionRepository,
    outboxRepository,
    outboxAttemptRepository,
    targetRepository,
    subscriptionRepository,
    inboxRepository,
    verificationRepository,
    orchestrationRunRepository,
    runRepository: {
      getLatestReasoningRunForAssetTimeframe: async () => run,
      getReasoningRunById: async (reasoningRunId: string) => (reasoningRunId === run.reasoningRunId ? run : null),
      listRecentReasoningRuns: async () => [run],
      saveReasoningRun: async () => {}
    },
    snapshotRepository: {
      getLatestSnapshotForAssetTimeframe: async () => snapshot,
      getSnapshotById: async (snapshotId: string) => (snapshotId === snapshot.snapshotId ? snapshot : null),
      getSnapshotByReasoningRunId: async (reasoningRunId: string) => (reasoningRunId === run.reasoningRunId ? snapshot : null),
      saveCognitionSnapshot: async () => {}
    },
    driftRepository: {
      getDriftById: async () => null,
      getLatestDriftForAssetTimeframe: async () => null,
      listRecentDrifts: async () => [],
      saveDriftRecord: async () => {}
    }
  };
}

export async function runNotificationOrchestrationRuntimeTests(): Promise<void> {
  const repos = buildRuntimeDeps();
  await repos.subscriptionRepository.saveSubscription({ subscriptionId: 'sub-o-1', subjectKind: 'user', subjectId: 'u-o-1', channel: 'in_app', asset: '*', timeframe: '*', ruleKey: '*', enabled: true, minMaterialityScore: null, createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z' });
  await repos.targetRepository.saveTarget({ targetId: 'target-o-1', subjectKind: 'user', subjectId: 'u-o-1', channel: 'in_app', targetKind: 'in_app_user', status: 'active', label: null, addressJson: '{}', createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z', verifiedAt: '2026-01-15T10:00:00.000Z' });

  const notifying = buildDecision({ decisionId: 'decision-o-1', decisionKey: 'decision|o|1', reasoningRunId: 'run-orch', channels: ['in_app'], shouldNotify: true });
  const silent = buildDecision({ decisionId: 'decision-o-2', decisionKey: 'decision|o|2', reasoningRunId: 'run-orch', channels: [], shouldNotify: false, shouldFire: false, suppressionApplied: true, reason: 'condition_not_met' });
  await repos.decisionRepository.saveDecision(buildDecisionRecord({ ...buildDecisionRecord(), decisionId: notifying.decisionId!, decisionKey: notifying.decisionKey!, reasoningRunId: 'run-orch', createdAt: '2026-01-15T10:01:00.000Z', decisionJson: JSON.stringify(notifying), channelsJson: JSON.stringify(notifying.channels), shouldNotify: true }));
  await repos.decisionRepository.saveDecision(buildDecisionRecord({ ...buildDecisionRecord(), decisionId: silent.decisionId!, decisionKey: silent.decisionKey!, reasoningRunId: 'run-orch', createdAt: '2026-01-15T10:02:00.000Z', decisionJson: JSON.stringify(silent), channelsJson: JSON.stringify(silent.channels), shouldNotify: false }));

  const staging = await stageDeliveriesForReasoningRun(repos, 'run-orch', '2026-01-15T10:03:00.000Z');
  assert(staging.evaluatedDecisionCount === 2 && staging.notifyingDecisionCount === 1, 'staging aggregator counts are exact');
  assert(staging.stagedDecisionCount === 1 && staging.skippedDecisionCount === 1, 'staging aggregator stages notifying only');
  assert(staging.reports[0]?.decisionId === 'decision-o-1', 'staging order deterministic by createdAt asc then decisionId asc');

  const endToEnd = await runNotificationEndToEndForReasoningRun(repos, 'run-orch', '2026-01-15T10:04:00.000Z');
  assert(endToEnd.success && endToEnd.policyReport !== null && endToEnd.stagingReport !== null, 'end-to-end successful policy + staging');
  const persistedEndToEnd = await repos.orchestrationRunRepository.getLatestRunForReasoningRun('run-orch');
  assert(Boolean(persistedEndToEnd?.policyEvaluationId), 'end-to-end persists orchestration run');

  const failedEndToEnd = await runNotificationEndToEndForReasoningRun(repos, 'missing-run', '2026-01-15T10:05:00.000Z');
  assert(!failedEndToEnd.success && failedEndToEnd.policyReport === null && failedEndToEnd.stagingReport === null, 'policy failure path returns deterministic failed report');

  const transport = createNotificationDeliveryTransport({}, { inboxRepository: repos.inboxRepository });
  const dispatchJob = await runNotificationDispatchJob(repos, transport, '2026-01-15T10:06:00.000Z', 50);
  assert(dispatchJob.stage === 'delivery_dispatch' && dispatchJob.dispatchedOutboxCount >= 1, 'dispatch job maps dispatchDue to orchestration report');

  await repos.verificationRepository.saveVerification({ verificationId: 'verify-o-1', verificationKey: 'verify|o|1', targetId: 'target-o-1', subjectKind: 'user', subjectId: 'u-o-1', channel: 'in_app', verificationKind: 'email_verification', tokenHash: 'h', issuedAt: '2026-01-15T08:00:00.000Z', expiresAt: '2026-01-15T09:00:00.000Z', consumedAt: null, status: 'pending', attemptCount: 0, lastAttemptAt: null, createdAt: '2026-01-15T08:00:00.000Z', updatedAt: '2026-01-15T08:00:00.000Z' });
  const expiryJob = await runNotificationVerificationExpiryJob(repos, '2026-01-15T10:06:00.000Z');
  assert(expiryJob.expiredVerificationCount === 1, 'verification expiry job persists exact expired count');

  const stuck = await listStuckDispatchingOutbox(repos, '2026-01-15T10:07:00.000Z', 1);
  assert(Array.isArray(stuck), 'stuck dispatch helper executes');
  await repos.verificationRepository.saveVerification({ verificationId: 'verify-o-2', verificationKey: 'verify|o|2', targetId: 'target-o-1', subjectKind: 'user', subjectId: 'u-o-1', channel: 'in_app', verificationKind: 'email_verification', tokenHash: 'h', issuedAt: '2026-01-15T10:00:00.000Z', expiresAt: '2026-01-15T10:30:00.000Z', consumedAt: null, status: 'pending', attemptCount: 0, lastAttemptAt: null, createdAt: '2026-01-15T10:00:00.000Z', updatedAt: '2026-01-15T10:00:00.000Z' });
  const nearExpiry = await listPendingVerificationsNearExpiry(repos, '2026-01-15T10:05:00.000Z', 30);
  assert(nearExpiry.length >= 1, 'near-expiry verification helper returns deterministic rows');
  const health = await summarizeNotificationRuntimeHealth(repos, '2026-01-15T10:08:00.000Z', 24);
  assert(health.deliveredCount >= 1, 'runtime health summary captures delivery totals');

  const latestRun = (await repos.orchestrationRunRepository.listRecentRuns(undefined, 1))[0];
  if (!latestRun) throw new Error('missing_orchestration_run_for_replay');
  const replay = await getNotificationOrchestrationReplayById(latestRun.orchestrationRunId, repos.orchestrationRunRepository);
  assert(replay?.record.orchestrationRunId === latestRun.orchestrationRunId, 'orchestration replay loads persisted record/report');

  const boundary = new CanonicalNotificationOrchestrationBoundaryService(repos, transport);
  await boundary.runNotificationEndToEndForReasoningRun('run-orch', '2026-01-15T10:09:00.000Z');
  const list = await boundary.listRecentNotificationOrchestrationRuns(undefined, 5);
  assert(list.length >= 1, 'canonical orchestration boundary lists runs');
  for (let i = 1; i < list.length; i += 1) {
    const previous = list[i - 1]!;
    const current = list[i]!;
    assert(Date.parse(previous.record.createdAt) >= Date.parse(current.record.createdAt), 'listRecentNotificationOrchestrationRuns ordering createdAt desc');
  }
  const replayFromBoundary = await boundary.replayNotificationOrchestrationRun(list[0]!.record.orchestrationRunId);
  assert(Boolean(replayFromBoundary?.report), 'boundary replay returns full payload');
  assert(Boolean(deserializeNotificationOrchestrationRunReport(list[0]!.record.reportJson)), 'deserializer validates stored report shape');

  await repos.orchestrationRunRepository.saveRun({ ...latestRun, orchestrationRunId: 'bad-orch-run', reportJson: '{bad' });
  let malformed = false;
  try { await getNotificationOrchestrationReplayById('bad-orch-run', repos.orchestrationRunRepository); } catch { malformed = true; }
  assert(malformed, 'malformed orchestration JSON fails deterministically');
}
