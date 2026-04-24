import { NotificationVerificationService } from '../verification/verification-service';
import type { NotificationDeliveryRuntimeRepositories } from '../persistence/contracts';
import type { NotificationOrchestrationRunReport } from './contracts';
import { buildNotificationOrchestrationRunRecord, buildOrchestrationRunId } from './report-utils';

export async function runNotificationVerificationExpiryJob(
  repositories: NotificationDeliveryRuntimeRepositories,
  asOfIso?: string
): Promise<NotificationOrchestrationRunReport> {
  const startedAt = asOfIso ?? new Date().toISOString();
  const verificationService = new NotificationVerificationService({
    targetRepository: repositories.targetRepository,
    verificationRepository: repositories.verificationRepository
  });
  const expiredVerificationCount = await verificationService.expireStaleVerifications(startedAt);
  const endedAt = startedAt;
  const report: NotificationOrchestrationRunReport = {
    orchestrationRunId: buildOrchestrationRunId('verification_expiry', 'global', startedAt),
    stage: 'verification_expiry',
    startedAt,
    endedAt,
    durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)),
    status: 'success',
    reasoningRunId: null,
    policyEvaluationId: null,
    evaluatedDecisionCount: 0,
    notifyingDecisionCount: 0,
    stagedOutboxCount: 0,
    dispatchedOutboxCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    deadCount: 0,
    expiredVerificationCount,
    failureReason: null,
    warnings: [],
    createdAt: endedAt
  };
  await repositories.orchestrationRunRepository.saveRun(buildNotificationOrchestrationRunRecord(report));
  return report;
}
