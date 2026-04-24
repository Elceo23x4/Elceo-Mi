import { deserializeNotificationDecision } from '../persistence/serialization';
import type { NotificationDeliveryRuntimeRepositories } from '../persistence/contracts';
import type { NotificationDeliveryStagingAggregateReport } from './contracts';
import { stageNotificationDeliveryForDecision } from '../delivery/staging-service';

export async function stageDeliveriesForReasoningRun(
  repositories: NotificationDeliveryRuntimeRepositories,
  reasoningRunId: string,
  stagedAt?: string
): Promise<NotificationDeliveryStagingAggregateReport> {
  const now = stagedAt ?? new Date().toISOString();
  const decisions = (await repositories.decisionRepository.listDecisionsForReasoningRun(reasoningRunId))
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt) || left.decisionId.localeCompare(right.decisionId));
  const notifying = decisions.filter((decision) => decision.shouldNotify);
  const reports = [] as NotificationDeliveryStagingAggregateReport['reports'];

  for (const decision of notifying) {
    const report = await stageNotificationDeliveryForDecision(decision, deserializeNotificationDecision(decision.decisionJson), repositories, now);
    reports.push(report);
  }

  return {
    reasoningRunId,
    evaluatedDecisionCount: decisions.length,
    notifyingDecisionCount: notifying.length,
    stagedDecisionCount: reports.length,
    stagedOutboxCount: reports.reduce((sum, report) => sum + report.stagedOutboxCount, 0),
    skippedDecisionCount: decisions.length - reports.length,
    targetCount: reports.reduce((sum, report) => sum + report.resolvedTargetCount, 0),
    reports
  };
}
