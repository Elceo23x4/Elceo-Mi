import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type {
  NotificationDecisionReplayBundle,
  NotificationDecisionRepository,
  NotificationOrchestrationRunRepository,
  NotificationOrchestrationReplayBundle
} from './contracts';
import type { NotificationOrchestrationStage } from '../orchestration/contracts';
import { deserializeNotificationDecision, deserializeNotificationOrchestrationRunReport } from './serialization';

export async function getNotificationDecisionReplayById(
  decisionId: string,
  repository: NotificationDecisionRepository
): Promise<NotificationDecisionReplayBundle | null> {
  const record = await repository.getDecisionById(decisionId);
  if (!record) return null;
  const decision = deserializeNotificationDecision(record.decisionJson);
  return { record, decision };
}

export async function getLatestNotifyingDecisionReplay(
  asset: CanonicalAssetSymbol,
  timeframe: Timeframe,
  repository: NotificationDecisionRepository,
  ruleKey?: string
): Promise<NotificationDecisionReplayBundle | null> {
  const record = ruleKey
    ? await repository.getLatestDecisionForRule(asset, timeframe, ruleKey)
    : (await repository.listRecentDecisions({ limit: 1, asset, timeframe, shouldNotify: true }))[0] ?? null;
  if (!record || !record.shouldNotify) return null;
  const decision = deserializeNotificationDecision(record.decisionJson);
  return { record, decision };
}

export async function listDecisionReplaysForReasoningRun(
  reasoningRunId: string,
  repository: NotificationDecisionRepository
): Promise<NotificationDecisionReplayBundle[]> {
  const records = await repository.listDecisionsForReasoningRun(reasoningRunId);
  return records.map((record) => ({ record, decision: deserializeNotificationDecision(record.decisionJson) }));
}

export async function getNotificationOrchestrationReplayById(
  orchestrationRunId: string,
  repository: NotificationOrchestrationRunRepository
): Promise<NotificationOrchestrationReplayBundle | null> {
  const record = await repository.getRunById(orchestrationRunId);
  if (!record) return null;
  return { record, report: deserializeNotificationOrchestrationRunReport(record.reportJson) };
}

export async function listRecentNotificationOrchestrationReplays(
  repository: NotificationOrchestrationRunRepository,
  stage?: NotificationOrchestrationStage,
  limit = 20
): Promise<NotificationOrchestrationReplayBundle[]> {
  const rows = await repository.listRecentRuns(stage, limit);
  return rows.map((record) => ({ record, report: deserializeNotificationOrchestrationRunReport(record.reportJson) }));
}
