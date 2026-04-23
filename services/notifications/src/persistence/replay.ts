import type { CanonicalAssetSymbol, Timeframe } from '@elceo/types';
import type { NotificationDecisionReplayBundle, NotificationDecisionRepository } from './contracts';
import { deserializeNotificationDecision } from './serialization';

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
