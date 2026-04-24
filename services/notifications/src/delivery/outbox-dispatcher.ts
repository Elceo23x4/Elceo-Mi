import type { NotificationChannel } from '@elceo/types';
import type { NotificationOutboxAttemptRepository, NotificationOutboxRepository, NotificationTargetRepository } from '../persistence/contracts';
import type { NotificationOutboxAttemptRecord } from './outbox-contracts';
import type { NotificationDeliveryTransport } from './transport';
import { deserializeTargetAwareNotificationPayload } from './replay-delivery';

export type NotificationOutboxDispatchItemReport = { outboxId: string; channel: NotificationChannel; status: 'delivered' | 'failed' | 'dead'; attemptCount: number; errorCode: string | null; errorMessage: string | null };
export type NotificationOutboxDispatchReport = { asOf: string; examinedCount: number; dispatchedCount: number; deliveredCount: number; failedCount: number; deadCount: number; reports: NotificationOutboxDispatchItemReport[] };
const buildNextAvailableAt = (attemptedAt: string, attemptCountAfterFailure: number): string => new Date(Date.parse(attemptedAt) + attemptCountAfterFailure * 5 * 60_000).toISOString();

export async function dispatchDueNotificationOutbox(asOfIso: string, limit: number, repositories: { outboxRepository: NotificationOutboxRepository; outboxAttemptRepository: NotificationOutboxAttemptRepository; targetRepository: NotificationTargetRepository }, transport: NotificationDeliveryTransport): Promise<NotificationOutboxDispatchReport> {
  const due = await repositories.outboxRepository.listDueOutboxItems(asOfIso, limit);
  const reports: NotificationOutboxDispatchItemReport[] = [];

  for (const item of due) {
    await repositories.outboxRepository.markDispatching(item.outboxId, asOfIso);
    let sendResult: { success: boolean; providerMessageId: string | null; errorCode: string | null; errorMessage: string | null; responseMeta: Record<string, unknown> | null };
    try {
      const envelope = deserializeTargetAwareNotificationPayload(item.payloadJson);
      if (envelope.channel !== item.channel || envelope.targetId !== item.targetId) {
        sendResult = { success: false, providerMessageId: null, errorCode: 'target_channel_mismatch', errorMessage: 'target_channel_mismatch', responseMeta: null };
      } else {
        const target = await repositories.targetRepository.getTargetById(item.targetId);
        if (!target || target.status !== 'active') {
          sendResult = { success: false, providerMessageId: null, errorCode: 'target_not_active', errorMessage: 'target_not_active', responseMeta: null };
        } else {
          sendResult = await transport.send(item, envelope, asOfIso);
        }
      }
    } catch {
      sendResult = { success: false, providerMessageId: null, errorCode: 'payload_deserialization_failed', errorMessage: 'payload_deserialization_failed', responseMeta: null };
    }

    const attemptRecord: NotificationOutboxAttemptRecord = {
      attemptId: `attempt|${item.outboxId}|${item.attemptCount + 1}|${asOfIso}`,
      outboxId: item.outboxId,
      channel: item.channel,
      attemptedAt: asOfIso,
      status: sendResult.success ? 'success' : 'failure',
      errorCode: sendResult.errorCode,
      errorMessage: sendResult.errorMessage,
      responseMetaJson: sendResult.responseMeta ? JSON.stringify(sendResult.responseMeta) : null
    };
    await repositories.outboxAttemptRepository.saveAttempt(attemptRecord);

    if (sendResult.success) {
      await repositories.outboxRepository.markDelivered(item.outboxId, asOfIso);
      reports.push({ outboxId: item.outboxId, channel: item.channel, status: 'delivered', attemptCount: item.attemptCount + 1, errorCode: null, errorMessage: null });
      continue;
    }
    const attemptCountAfterFailure = item.attemptCount + 1;
    if (attemptCountAfterFailure >= 5) {
      await repositories.outboxRepository.markDead(item.outboxId, asOfIso, sendResult.errorCode, sendResult.errorMessage);
      reports.push({ outboxId: item.outboxId, channel: item.channel, status: 'dead', attemptCount: attemptCountAfterFailure, errorCode: sendResult.errorCode, errorMessage: sendResult.errorMessage });
    } else {
      await repositories.outboxRepository.markFailed(item.outboxId, asOfIso, buildNextAvailableAt(asOfIso, attemptCountAfterFailure), sendResult.errorCode, sendResult.errorMessage);
      reports.push({ outboxId: item.outboxId, channel: item.channel, status: 'failed', attemptCount: attemptCountAfterFailure, errorCode: sendResult.errorCode, errorMessage: sendResult.errorMessage });
    }
  }

  return { asOf: asOfIso, examinedCount: due.length, dispatchedCount: reports.length, deliveredCount: reports.filter((entry) => entry.status === 'delivered').length, failedCount: reports.filter((entry) => entry.status === 'failed').length, deadCount: reports.filter((entry) => entry.status === 'dead').length, reports };
}
