import type { NotificationChannel } from '@elceo/types';
import type { NotificationOutboxAttemptRepository, NotificationOutboxRepository, NotificationSubscriptionRepository, NotificationTargetRepository } from '../persistence/contracts';
import type { NotificationOutboxAttemptRecord } from './outbox-contracts';
import type { NotificationDeliveryTransport, NotificationTransportResult } from './transport';
import { deserializeTargetAwareNotificationPayload } from './replay-delivery';
import { safeNotificationChecksum } from '../management/redaction';

export type NotificationOutboxDispatchItemReport = { outboxId: string; channel: NotificationChannel; status: 'delivered' | 'failed' | 'dead'; attemptCount: number; errorCode: string | null; errorMessage: string | null };
export type NotificationOutboxDispatchReport = { asOf: string; examinedCount: number; dispatchedCount: number; deliveredCount: number; failedCount: number; deadCount: number; reports: NotificationOutboxDispatchItemReport[] };
export const buildNotificationRetryAvailableAt = (attemptedAt: string, attemptCountAfterFailure: number, reasonCode?: string | null): string => {
  const baseMinutes = reasonCode === 'rate_limited' ? 30 : 5;
  const capped = Math.min(6, Math.max(1, attemptCountAfterFailure));
  return new Date(Date.parse(attemptedAt) + baseMinutes * 60_000 * 2 ** (capped - 1)).toISOString();
};

const isTerminalFailure = (result: NotificationTransportResult): boolean => result.outcome === 'permanent_failure' || result.outcome === 'invalid_target' || result.outcome === 'unsubscribed_or_disabled' || result.retryable === false;
const normalizedReceiptStatus = (result: NotificationTransportResult): string => result.outcome ?? (result.success ? 'accepted' : 'temporary_failure');

export async function dispatchDueNotificationOutbox(asOfIso: string, limit: number, repositories: { outboxRepository: NotificationOutboxRepository; outboxAttemptRepository: NotificationOutboxAttemptRepository; targetRepository: NotificationTargetRepository; subscriptionRepository?: NotificationSubscriptionRepository }, transport: NotificationDeliveryTransport): Promise<NotificationOutboxDispatchReport> {
  const due = await repositories.outboxRepository.listDueOutboxItems(asOfIso, limit);
  const reports: NotificationOutboxDispatchItemReport[] = [];

  for (const item of due) {
    await repositories.outboxRepository.markDispatching(item.outboxId, asOfIso);
    let sendResult: NotificationTransportResult;
    try {
      const envelope = deserializeTargetAwareNotificationPayload(item.payloadJson);
      if (envelope.channel !== item.channel || envelope.targetId !== item.targetId) {
        sendResult = { success: false, outcome: 'permanent_failure', retryable: false, providerMessageId: null, errorCode: 'target_channel_mismatch', errorMessage: 'target_channel_mismatch', responseMeta: null };
      } else {
        const target = await repositories.targetRepository.getTargetById(item.targetId);
        if (!target || target.status !== 'active') {
          sendResult = { success: false, outcome: 'unsubscribed_or_disabled', retryable: false, providerMessageId: null, errorCode: 'target_not_active', errorMessage: 'target_not_active', responseMeta: { targetHash: safeNotificationChecksum(item.targetKey) } };
        } else {
          const subscriptions = repositories.subscriptionRepository ? await repositories.subscriptionRepository.listSubscriptionsForSubject(item.subjectKind, item.subjectId) : [];
          const channelBlocked = subscriptions.some((sub) => sub.channel === item.channel && !sub.enabled);
          const globalBlocked = subscriptions.some((sub) => sub.channel === 'in_app' && sub.ruleKey === 'global_disable' && !sub.enabled);
          if (channelBlocked || globalBlocked) {
            sendResult = { success: false, outcome: 'unsubscribed_or_disabled', retryable: false, providerMessageId: null, errorCode: 'unsubscribed_or_disabled', errorMessage: globalBlocked ? 'global_notification_disable' : 'channel_preference_disabled', responseMeta: { targetHash: safeNotificationChecksum(item.targetKey), policy: item.subjectKind === 'ops' ? 'operator_notification_policy' : 'user_notification_policy' } };
          } else {
            sendResult = await transport.send(item, envelope, asOfIso);
          }
        }
      }
    } catch {
      sendResult = { success: false, outcome: 'permanent_failure', retryable: false, providerMessageId: null, errorCode: 'payload_deserialization_failed', errorMessage: 'payload_deserialization_failed', responseMeta: null };
    }

    const attemptRecord: NotificationOutboxAttemptRecord = {
      attemptId: `attempt|${item.outboxId}|${item.attemptCount + 1}|${asOfIso}`,
      outboxId: item.outboxId,
      channel: item.channel,
      attemptedAt: asOfIso,
      status: sendResult.success ? 'success' : 'failure',
      errorCode: sendResult.errorCode,
      errorMessage: sendResult.errorMessage,
      providerKind: sendResult.responseMeta && typeof sendResult.responseMeta.providerKind === 'string' ? sendResult.responseMeta.providerKind : null,
      providerMessageId: sendResult.providerMessageId,
      receiptStatus: normalizedReceiptStatus(sendResult),
      responseMetaJson: sendResult.responseMeta ? JSON.stringify(sendResult.responseMeta) : null
    };
    await repositories.outboxAttemptRepository.saveAttempt(attemptRecord);

    if (sendResult.success) {
      await repositories.outboxRepository.markDelivered(item.outboxId, asOfIso);
      reports.push({ outboxId: item.outboxId, channel: item.channel, status: 'delivered', attemptCount: item.attemptCount + 1, errorCode: null, errorMessage: null });
      continue;
    }
    const attemptCountAfterFailure = item.attemptCount + 1;
    if (isTerminalFailure(sendResult) || attemptCountAfterFailure >= 5) {
      await repositories.outboxRepository.markDead(item.outboxId, asOfIso, sendResult.errorCode, sendResult.errorMessage);
      reports.push({ outboxId: item.outboxId, channel: item.channel, status: 'dead', attemptCount: attemptCountAfterFailure, errorCode: sendResult.errorCode, errorMessage: sendResult.errorMessage });
    } else {
      await repositories.outboxRepository.markFailed(item.outboxId, asOfIso, buildNotificationRetryAvailableAt(asOfIso, attemptCountAfterFailure, sendResult.errorCode), sendResult.errorCode, sendResult.errorMessage);
      reports.push({ outboxId: item.outboxId, channel: item.channel, status: 'failed', attemptCount: attemptCountAfterFailure, errorCode: sendResult.errorCode, errorMessage: sendResult.errorMessage });
    }
  }

  return { asOf: asOfIso, examinedCount: due.length, dispatchedCount: reports.length, deliveredCount: reports.filter((entry) => entry.status === 'delivered').length, failedCount: reports.filter((entry) => entry.status === 'failed').length, deadCount: reports.filter((entry) => entry.status === 'dead').length, reports };
}
