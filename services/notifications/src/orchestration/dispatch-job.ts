import { dispatchDueNotificationOutbox } from '../delivery/outbox-dispatcher';
import type { NotificationDeliveryRuntimeRepositories } from '../persistence/contracts';
import type { NotificationDeliveryTransport } from '../delivery/transport';
import type { NotificationOrchestrationRunReport } from './contracts';
import { buildNotificationOrchestrationRunRecord, buildOrchestrationRunId } from './report-utils';

export async function runNotificationDispatchJob(
  repositories: NotificationDeliveryRuntimeRepositories,
  transport: NotificationDeliveryTransport,
  asOfIso?: string,
  limit = 100
): Promise<NotificationOrchestrationRunReport> {
  const startedAt = asOfIso ?? new Date().toISOString();
  const dispatchReport = await dispatchDueNotificationOutbox(startedAt, limit, repositories, transport);
  const endedAt = startedAt;
  const report: NotificationOrchestrationRunReport = {
    orchestrationRunId: buildOrchestrationRunId('delivery_dispatch', 'global', startedAt),
    stage: 'delivery_dispatch',
    startedAt,
    endedAt,
    durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)),
    status: dispatchReport.failedCount > 0 || dispatchReport.deadCount > 0 ? 'partial_success' : 'success',
    reasoningRunId: null,
    policyEvaluationId: null,
    evaluatedDecisionCount: 0,
    notifyingDecisionCount: 0,
    stagedOutboxCount: 0,
    dispatchedOutboxCount: dispatchReport.dispatchedCount,
    deliveredCount: dispatchReport.deliveredCount,
    failedCount: dispatchReport.failedCount,
    deadCount: dispatchReport.deadCount,
    expiredVerificationCount: 0,
    failureReason: null,
    warnings: [],
    createdAt: endedAt
  };
  await repositories.orchestrationRunRepository.saveRun(buildNotificationOrchestrationRunRecord(report));
  return report;
}
