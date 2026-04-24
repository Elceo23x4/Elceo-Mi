import { CanonicalNotificationPolicyBoundaryService } from '../runtime/canonical-notification-policy-boundary';
import type { NotificationDeliveryRuntimeRepositories } from '../persistence/contracts';
import type { NotificationEndToEndReport, NotificationOrchestrationRunReport } from './contracts';
import { stageDeliveriesForReasoningRun } from './staging-aggregator';
import { buildNotificationOrchestrationRunRecord, buildOrchestrationRunId } from './report-utils';

export async function runNotificationEndToEndForReasoningRun(
  repositories: NotificationDeliveryRuntimeRepositories,
  reasoningRunId: string,
  evaluatedAt?: string
): Promise<NotificationEndToEndReport> {
  const startedAt = evaluatedAt ?? new Date().toISOString();
  const warnings: string[] = [];
  const policyBoundary = new CanonicalNotificationPolicyBoundaryService(repositories);

  let policyReport: NotificationEndToEndReport['policyReport'] = null;
  let stagingReport: NotificationEndToEndReport['stagingReport'] = null;
  let success = false;
  let failureReason: string | null = null;

  try {
    policyReport = await policyBoundary.evaluateForReasoningRun({ reasoningRunId, evaluatedAt: startedAt });
    stagingReport = await stageDeliveriesForReasoningRun(repositories, reasoningRunId, startedAt);
    if (stagingReport.skippedDecisionCount > 0) {
      warnings.push(`skipped_decisions:${stagingReport.skippedDecisionCount}`);
    }
    success = true;
  } catch (error) {
    failureReason = error instanceof Error ? error.message : 'unknown_error';
    warnings.push(`policy_or_staging_failure:${failureReason}`);
  }

  const endedAt = startedAt;
  const runReport: NotificationOrchestrationRunReport = {
    orchestrationRunId: buildOrchestrationRunId('policy_evaluation', reasoningRunId, startedAt),
    stage: 'policy_evaluation',
    startedAt,
    endedAt,
    durationMs: Math.max(0, Date.parse(endedAt) - Date.parse(startedAt)),
    status: success ? (warnings.length > 0 ? 'partial_success' : 'success') : 'failed',
    reasoningRunId,
    policyEvaluationId: policyReport?.evaluationId ?? null,
    evaluatedDecisionCount: stagingReport?.evaluatedDecisionCount ?? 0,
    notifyingDecisionCount: stagingReport?.notifyingDecisionCount ?? 0,
    stagedOutboxCount: stagingReport?.stagedOutboxCount ?? 0,
    dispatchedOutboxCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    deadCount: 0,
    expiredVerificationCount: 0,
    failureReason,
    warnings,
    createdAt: endedAt
  };

  await repositories.orchestrationRunRepository.saveRun(buildNotificationOrchestrationRunRecord(runReport));

  return {
    reasoningRunId,
    evaluatedAt: startedAt,
    policyReport,
    stagingReport,
    warnings,
    success
  };
}
