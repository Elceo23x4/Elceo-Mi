import type { NotificationDeliveryRuntimeRepositories } from '../persistence/contracts';
import type { NotificationDeliveryTransport } from '../delivery/transport';
import type { NotificationOrchestrationStage } from '../orchestration/contracts';
import { runNotificationDispatchJob } from '../orchestration/dispatch-job';
import { runNotificationEndToEndForReasoningRun } from '../orchestration/end-to-end-service';
import { summarizeNotificationRuntimeHealth } from '../orchestration/maintenance';
import { getNotificationOrchestrationReplayById, listRecentNotificationOrchestrationReplays } from '../persistence/replay';
import { runNotificationVerificationExpiryJob } from '../orchestration/verification-expiry-job';

export class CanonicalNotificationOrchestrationBoundaryService {
  constructor(
    private readonly repositories: NotificationDeliveryRuntimeRepositories,
    private readonly transport: NotificationDeliveryTransport
  ) {}

  async runNotificationEndToEndForReasoningRun(reasoningRunId: string, evaluatedAt?: string) {
    return runNotificationEndToEndForReasoningRun(this.repositories, reasoningRunId, evaluatedAt);
  }

  async runNotificationDispatchJob(asOfIso?: string, limit?: number) {
    return runNotificationDispatchJob(this.repositories, this.transport, asOfIso, limit);
  }

  async runNotificationVerificationExpiryJob(asOfIso?: string) {
    return runNotificationVerificationExpiryJob(this.repositories, asOfIso);
  }

  async summarizeNotificationRuntimeHealth(asOfIso?: string, lookbackHours?: number) {
    return summarizeNotificationRuntimeHealth(this.repositories, asOfIso, lookbackHours);
  }

  async listRecentNotificationOrchestrationRuns(stage?: NotificationOrchestrationStage, limit = 20) {
    return listRecentNotificationOrchestrationReplays(this.repositories.orchestrationRunRepository, stage, limit);
  }

  async replayNotificationOrchestrationRun(orchestrationRunId: string) {
    return getNotificationOrchestrationReplayById(orchestrationRunId, this.repositories.orchestrationRunRepository);
  }
}
