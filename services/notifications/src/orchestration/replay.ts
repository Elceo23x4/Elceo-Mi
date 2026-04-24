import type { NotificationOrchestrationStage } from './contracts';
import type { NotificationOrchestrationRunRepository } from '../persistence/contracts';
import { deserializeNotificationOrchestrationRunReport } from '../persistence/serialization';

export async function getNotificationOrchestrationReplayById(
  orchestrationRunRepository: NotificationOrchestrationRunRepository,
  orchestrationRunId: string
) {
  const record = await orchestrationRunRepository.getRunById(orchestrationRunId);
  if (!record) return null;
  return {
    record,
    report: deserializeNotificationOrchestrationRunReport(record.reportJson)
  };
}

export async function listRecentNotificationOrchestrationReplays(
  orchestrationRunRepository: NotificationOrchestrationRunRepository,
  stage?: NotificationOrchestrationStage,
  limit = 20
) {
  const rows = await orchestrationRunRepository.listRecentRuns(stage, limit);
  return rows.map((record) => ({ record, report: deserializeNotificationOrchestrationRunReport(record.reportJson) }));
}
