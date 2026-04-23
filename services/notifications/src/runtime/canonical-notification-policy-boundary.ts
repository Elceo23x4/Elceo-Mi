import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import { evaluateNotificationPolicyForReasoningRun, type NotificationPolicyEvaluationReport } from '../policy/decision-engine';
import { loadNotificationPolicyContextForReasoningRun } from '../policy/input-loader';
import type { NotificationPolicyEvaluationRepositories } from '../persistence/contracts';

export type CanonicalNotificationPolicyBoundaryEvaluateParams = {
  reasoningRunId: string;
  evaluatedAt?: string;
};

export class CanonicalNotificationPolicyBoundaryService {
  constructor(private readonly repositories: NotificationPolicyEvaluationRepositories) {}

  async evaluateForReasoningRun(params: CanonicalNotificationPolicyBoundaryEvaluateParams): Promise<NotificationPolicyEvaluationReport> {
    const evaluatedAt = params.evaluatedAt ?? new Date().toISOString();
    const context = await loadNotificationPolicyContextForReasoningRun(params.reasoningRunId, this.repositories, evaluatedAt);
    return evaluateNotificationPolicyForReasoningRun(context, this.repositories, evaluatedAt);
  }

  async evaluateLatestForAssetTimeframe(asset: CanonicalAssetSymbol, timeframe: Timeframe, evaluatedAt?: string): Promise<NotificationPolicyEvaluationReport> {
    const latest = await this.repositories.runRepository.getLatestReasoningRunForAssetTimeframe(asset, timeframe);
    if (!latest) {
      throw new Error(`missing_reasoning_run_for_asset_timeframe:${asset}:${timeframe}`);
    }
    return evaluatedAt
      ? this.evaluateForReasoningRun({ reasoningRunId: latest.reasoningRunId, evaluatedAt })
      : this.evaluateForReasoningRun({ reasoningRunId: latest.reasoningRunId });
  }
}
