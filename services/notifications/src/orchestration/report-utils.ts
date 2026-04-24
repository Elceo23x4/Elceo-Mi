import type { PersistedNotificationOrchestrationRunRecord } from '../persistence/contracts';
import { serializeNotificationOrchestrationRunReport } from '../persistence/serialization';
import type { NotificationOrchestrationRunReport, NotificationOrchestrationStage } from './contracts';

export function buildOrchestrationRunId(stage: NotificationOrchestrationStage, identity: string, startedAt: string): string {
  return `orchestration|${stage}|${identity}|${startedAt}`;
}

export function buildNotificationOrchestrationRunRecord(
  report: NotificationOrchestrationRunReport
): PersistedNotificationOrchestrationRunRecord {
  return {
    orchestrationRunId: report.orchestrationRunId,
    stage: report.stage,
    startedAt: report.startedAt,
    endedAt: report.endedAt,
    durationMs: report.durationMs,
    status: report.status,
    reasoningRunId: report.reasoningRunId,
    policyEvaluationId: report.policyEvaluationId,
    evaluatedDecisionCount: report.evaluatedDecisionCount,
    notifyingDecisionCount: report.notifyingDecisionCount,
    stagedOutboxCount: report.stagedOutboxCount,
    dispatchedOutboxCount: report.dispatchedOutboxCount,
    deliveredCount: report.deliveredCount,
    failedCount: report.failedCount,
    deadCount: report.deadCount,
    expiredVerificationCount: report.expiredVerificationCount,
    failureReason: report.failureReason,
    warningsJson: JSON.stringify(report.warnings),
    createdAt: report.createdAt,
    reportJson: serializeNotificationOrchestrationRunReport(report)
  };
}
