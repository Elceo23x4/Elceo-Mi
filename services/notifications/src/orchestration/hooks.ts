import type { NotificationDeliveryRuntimeRepositories } from '../persistence/contracts';
import type { NotificationEndToEndReport } from './contracts';
import { runNotificationEndToEndForReasoningRun } from './end-to-end-service';

export async function runNotificationsForReasoningCompletion(
  repositories: NotificationDeliveryRuntimeRepositories,
  reasoningRunId: string,
  evaluatedAt?: string
): Promise<NotificationEndToEndReport> {
  return runNotificationEndToEndForReasoningRun(repositories, reasoningRunId, evaluatedAt);
}
