import type { NotificationTargetRecord } from '@elceo/types';
import type { NotificationTargetRepository } from '../persistence/contracts';
import type { NotificationSubscriptionMatch } from './subscription-matcher';

export type ResolvedNotificationTarget = {
  targetId: string;
  targetKey: string;
  subjectKind: NotificationTargetRecord['subjectKind'];
  subjectId: string;
  channel: NotificationTargetRecord['channel'];
  targetKind: NotificationTargetRecord['targetKind'];
  addressJson: string;
  label: string | null;
  sourceSubscriptionId: string;
};

export async function resolveTargetsForSubscriptionMatches(
  matches: NotificationSubscriptionMatch[],
  repositories: { targetRepository: NotificationTargetRepository }
): Promise<ResolvedNotificationTarget[]> {
  const dedupe = new Set<string>();
  const resolved: ResolvedNotificationTarget[] = [];
  for (const match of matches) {
    const targets = await repositories.targetRepository.listTargetsForSubject(match.subjectKind, match.subjectId);
    for (const target of targets) {
      if (target.channel !== match.channel || target.status !== 'active') continue;
      const dedupeKey = `${target.targetId}|${target.channel}`;
      if (dedupe.has(dedupeKey)) continue;
      dedupe.add(dedupeKey);
      resolved.push({
        targetId: target.targetId,
        targetKey: `target|${target.targetId}`,
        subjectKind: target.subjectKind,
        subjectId: target.subjectId,
        channel: target.channel,
        targetKind: target.targetKind,
        addressJson: target.addressJson,
        label: target.label,
        sourceSubscriptionId: match.subscriptionId
      });
    }
  }
  return resolved;
}
