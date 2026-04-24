import type { NotificationDecision, NotificationSubscriptionRecord } from '@elceo/types';
import type { PersistedNotificationDecisionRecord, NotificationSubscriptionRepository } from '../persistence/contracts';

export type NotificationSubscriptionMatch = {
  subscriptionId: string;
  subjectKind: NotificationSubscriptionRecord['subjectKind'];
  subjectId: string;
  channel: NotificationSubscriptionRecord['channel'];
  assetScope: NotificationSubscriptionRecord['asset'];
  timeframeScope: NotificationSubscriptionRecord['timeframe'];
  ruleKeyScope: string;
  minMaterialityScore: number | null;
};

const SUBJECT_PRIORITY: Record<NotificationSubscriptionRecord['subjectKind'], number> = { user: 0, workspace: 1, ops: 2 };

export async function matchSubscriptionsForDecision(
  _decisionRecord: PersistedNotificationDecisionRecord,
  decision: NotificationDecision,
  repositories: { subscriptionRepository: NotificationSubscriptionRepository }
): Promise<NotificationSubscriptionMatch[]> {
  if (!decision.shouldNotify || decision.materialityScore === undefined) return [];
  const matches: NotificationSubscriptionMatch[] = [];
  for (const channel of decision.channels) {
    const subs = await repositories.subscriptionRepository.listEnabledSubscriptionsForChannel(channel);
    for (const sub of subs) {
      const assetOk = sub.asset === '*' || sub.asset === decision.asset;
      const timeframeOk = sub.timeframe === '*' || sub.timeframe === decision.timeframe;
      const ruleOk = sub.ruleKey === '*' || sub.ruleKey === decision.ruleKey;
      const materialityOk = sub.minMaterialityScore === null || decision.materialityScore >= sub.minMaterialityScore;
      if (assetOk && timeframeOk && ruleOk && materialityOk) {
        matches.push({
          subscriptionId: sub.subscriptionId,
          subjectKind: sub.subjectKind,
          subjectId: sub.subjectId,
          channel: sub.channel,
          assetScope: sub.asset,
          timeframeScope: sub.timeframe,
          ruleKeyScope: sub.ruleKey,
          minMaterialityScore: sub.minMaterialityScore
        });
      }
    }
  }

  matches.sort((a, b) => {
    const channelOrder = decision.channels.indexOf(a.channel) - decision.channels.indexOf(b.channel);
    if (channelOrder !== 0) return channelOrder;
    const subjectOrder = SUBJECT_PRIORITY[a.subjectKind] - SUBJECT_PRIORITY[b.subjectKind];
    if (subjectOrder !== 0) return subjectOrder;
    const subjectIdOrder = a.subjectId.localeCompare(b.subjectId);
    if (subjectIdOrder !== 0) return subjectIdOrder;
    return a.subscriptionId.localeCompare(b.subscriptionId);
  });

  return matches;
}
