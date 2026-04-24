import type { NotificationChannel, NotificationDecision } from '@elceo/types';
import type {
  NotificationDecisionRepository,
  NotificationOutboxAttemptRepository,
  NotificationOutboxRepository,
  NotificationSubscriptionRepository,
  NotificationTargetRepository,
  PersistedNotificationDecisionRecord
} from '../persistence/contracts';
import type { NotificationOutboxRecord } from './outbox-contracts';
import { buildNotificationOutboxKey } from './outbox-dedupe';
import { buildTargetAwareChannelPayloadForDecision } from './payload-builders';
import { matchSubscriptionsForDecision } from './subscription-matcher';
import { resolveTargetsForSubscriptionMatches } from './target-resolver';

export type NotificationDeliveryStagingReport = {
  decisionId: string;
  attemptedChannelCount: number;
  matchedSubscriptionCount: number;
  resolvedTargetCount: number;
  stagedOutboxCount: number;
  channels: NotificationChannel[];
  targetIds: string[];
  outboxIds: string[];
  skipped: boolean;
  skipReason: string | null;
};

export type NotificationDeliveryStagingRepositories = {
  decisionRepository: NotificationDecisionRepository;
  outboxRepository: NotificationOutboxRepository;
  outboxAttemptRepository: NotificationOutboxAttemptRepository;
  subscriptionRepository: NotificationSubscriptionRepository;
  targetRepository: NotificationTargetRepository;
};

export async function stageNotificationDeliveryForDecision(
  record: PersistedNotificationDecisionRecord,
  decision: NotificationDecision,
  repositories: NotificationDeliveryStagingRepositories,
  stagedAt: string
): Promise<NotificationDeliveryStagingReport> {
  if (!decision.shouldNotify || !record.shouldNotify) {
    return { decisionId: record.decisionId, attemptedChannelCount: 0, matchedSubscriptionCount: 0, resolvedTargetCount: 0, stagedOutboxCount: 0, channels: [], targetIds: [], outboxIds: [], skipped: true, skipReason: 'non_notifying_decision' };
  }
  const matches = await matchSubscriptionsForDecision(record, decision, repositories);
  if (matches.length === 0) {
    return { decisionId: record.decisionId, attemptedChannelCount: decision.channels.length, matchedSubscriptionCount: 0, resolvedTargetCount: 0, stagedOutboxCount: 0, channels: [], targetIds: [], outboxIds: [], skipped: true, skipReason: 'no_matching_subscriptions' };
  }
  const resolvedTargets = await resolveTargetsForSubscriptionMatches(matches, repositories);
  if (resolvedTargets.length === 0) {
    return { decisionId: record.decisionId, attemptedChannelCount: decision.channels.length, matchedSubscriptionCount: matches.length, resolvedTargetCount: 0, stagedOutboxCount: 0, channels: [], targetIds: [], outboxIds: [], skipped: true, skipReason: 'no_active_targets' };
  }

  const outboxIds: string[] = [];
  for (const target of resolvedTargets) {
    const envelope = buildTargetAwareChannelPayloadForDecision(record, decision, target);
    const outboxKey = buildNotificationOutboxKey(record.decisionKey, target.channel, target.targetKey);
    const outboxId = outboxKey;
    const existing = await repositories.outboxRepository.getOutboxByKey(outboxKey);
    if (!existing) {
      const outboxRecord: NotificationOutboxRecord = {
        outboxId,
        outboxKey,
        decisionId: record.decisionId,
        decisionKey: record.decisionKey,
        asset: record.asset,
        timeframe: record.timeframe,
        ruleKey: record.ruleKey,
        channel: target.channel,
        targetId: target.targetId,
        subjectKind: target.subjectKind,
        subjectId: target.subjectId,
        targetKey: target.targetKey,
        deliveryAddressJson: target.addressJson,
        status: 'staged',
        availableAt: stagedAt,
        lastAttemptAt: null,
        deliveredAt: null,
        deadAt: null,
        attemptCount: 0,
        lastErrorCode: null,
        lastErrorMessage: null,
        payloadJson: JSON.stringify(envelope),
        createdAt: stagedAt,
        updatedAt: stagedAt
      };
      await repositories.outboxRepository.stageOutbox(outboxRecord);
    }
    const persisted = await repositories.outboxRepository.getOutboxByKey(outboxKey);
    if (persisted) outboxIds.push(persisted.outboxId);
  }

  return {
    decisionId: record.decisionId,
    attemptedChannelCount: decision.channels.length,
    matchedSubscriptionCount: matches.length,
    resolvedTargetCount: resolvedTargets.length,
    stagedOutboxCount: outboxIds.length,
    channels: [...new Set(resolvedTargets.map((item) => item.channel))],
    targetIds: resolvedTargets.map((item) => item.targetId),
    outboxIds,
    skipped: false,
    skipReason: null
  };
}
