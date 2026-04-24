import type { NotificationPolicyEvaluationReport } from '../policy/decision-engine';
import type { NotificationDeliveryStagingReport } from '../delivery/staging-service';

export type NotificationOrchestrationStage =
  | 'policy_evaluation'
  | 'delivery_staging'
  | 'delivery_dispatch'
  | 'verification_expiry'
  | 'maintenance';

export type NotificationOrchestrationRunStatus = 'success' | 'partial_success' | 'failed';

export type NotificationOrchestrationRunReport = {
  orchestrationRunId: string;
  stage: NotificationOrchestrationStage;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  status: NotificationOrchestrationRunStatus;
  reasoningRunId: string | null;
  policyEvaluationId: string | null;
  evaluatedDecisionCount: number;
  notifyingDecisionCount: number;
  stagedOutboxCount: number;
  dispatchedOutboxCount: number;
  deliveredCount: number;
  failedCount: number;
  deadCount: number;
  expiredVerificationCount: number;
  failureReason: string | null;
  warnings: string[];
  createdAt: string;
};

export type NotificationDeliveryStagingAggregateReport = {
  reasoningRunId: string;
  evaluatedDecisionCount: number;
  notifyingDecisionCount: number;
  stagedDecisionCount: number;
  stagedOutboxCount: number;
  skippedDecisionCount: number;
  targetCount: number;
  reports: NotificationDeliveryStagingReport[];
};

export type NotificationEndToEndReport = {
  reasoningRunId: string;
  evaluatedAt: string;
  policyReport: NotificationPolicyEvaluationReport | null;
  stagingReport: NotificationDeliveryStagingAggregateReport | null;
  warnings: string[];
  success: boolean;
};
