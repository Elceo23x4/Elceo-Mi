import { CanonicalNotificationVerificationBoundaryService } from '../runtime/canonical-notification-verification-boundary.js';
import { MemoryNotificationDecisionRepository, MemoryNotificationInboxRepository, MemoryNotificationOutboxAttemptRepository, MemoryNotificationOutboxRepository, MemoryNotificationSubscriptionRepository, MemoryNotificationTargetRepository, MemoryNotificationVerificationRepository } from '../persistence/memory-notification-repository.js';

const assert = (condition: boolean, message: string): void => { if (!condition) throw new Error(message); };

export async function runCanonicalNotificationVerificationBoundaryTests(): Promise<void> {
  const repositories = {
    decisionRepository: new MemoryNotificationDecisionRepository(),
    outboxRepository: new MemoryNotificationOutboxRepository(),
    outboxAttemptRepository: new MemoryNotificationOutboxAttemptRepository(),
    subscriptionRepository: new MemoryNotificationSubscriptionRepository(),
    targetRepository: new MemoryNotificationTargetRepository(),
    inboxRepository: new MemoryNotificationInboxRepository(),
    verificationRepository: new MemoryNotificationVerificationRepository(),
    runRepository: { getLatestReasoningRunForAssetTimeframe: async () => null, getReasoningRunById: async () => null, listRecentReasoningRuns: async () => [], saveReasoningRun: async () => {} },
    snapshotRepository: { getLatestSnapshotForAssetTimeframe: async () => null, getSnapshotById: async () => null, getSnapshotByReasoningRunId: async () => null, saveCognitionSnapshot: async () => {} },
    driftRepository: { getDriftById: async () => null, getLatestDriftForAssetTimeframe: async () => null, listRecentDrifts: async () => [], saveDriftRecord: async () => {} }
  };
  await repositories.targetRepository.saveTarget({ targetId: 'tv1', subjectKind: 'user', subjectId: 'u', channel: 'email', targetKind: 'email_address', status: 'unverified', label: null, addressJson: '{"email":"x@y.z"}', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', verifiedAt: null });

  const boundary = new CanonicalNotificationVerificationBoundaryService(repositories);
  const issue = await boundary.issueTargetVerification('tv1', '2026-01-01T00:01:00.000Z');
  assert(issue.verificationId.length > 0, 'issue should return verification id');
  const consume = await boundary.consumeTargetVerification('tv1', issue.rawToken, '2026-01-01T00:02:00.000Z');
  assert(consume.verified, 'consume should verify target');
  const replay = await boundary.getVerificationReplayById(issue.verificationId);
  assert(Boolean(replay?.tokenHash) && replay?.status === 'consumed', 'replay should return consumed verification without raw token');
}
