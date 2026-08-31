import type { NotificationChannel, NotificationProviderEventKind, NotificationReceiptSeverity, NotificationTargetHealthState } from '@elceo/types';
import { correlateProviderEvent } from './correlation';
import { normalizeHttpEmailProviderEvent, normalizeProviderFailureEvent, normalizePushProviderEvent, normalizeUnknownProviderEvent } from './normalizers';
import { buildNotificationDeliveryReceipt } from './receipt-builder';
import { applyReceiptToTargetHealth } from './target-health';
import type { NotificationDecisionRepository, NotificationDeliveryReceiptRepository, NotificationOutboxAttemptRepository, NotificationOutboxRepository, NotificationProviderEventRepository, NotificationTargetHealthRepository, NotificationTargetRepository } from '../persistence/contracts';

export type NotificationProviderEventProcessingResult = {
  providerEventId: string;
  receiptId: string;
  correlated: boolean;
  targetId: string | null;
  outboxId: string | null;
  decisionId: string | null;
  healthState: NotificationTargetHealthState | null;
  targetDisabled: boolean;
  eventKind: NotificationProviderEventKind;
  severity: NotificationReceiptSeverity;
};

export async function processProviderEvent(params: { providerKind: string; channel: NotificationChannel; rawEvent: unknown; receivedAt?: string }, repositories: { providerEventRepository: NotificationProviderEventRepository; receiptRepository: NotificationDeliveryReceiptRepository; targetHealthRepository: NotificationTargetHealthRepository; targetRepository: NotificationTargetRepository; outboxRepository: NotificationOutboxRepository; outboxAttemptRepository: NotificationOutboxAttemptRepository; decisionRepository: NotificationDecisionRepository }): Promise<NotificationProviderEventProcessingResult> {
  const receivedAt = params.receivedAt ?? new Date().toISOString();
  const normalized = params.channel === 'email'
    ? normalizeHttpEmailProviderEvent(params.rawEvent, params.providerKind, receivedAt)
    : params.channel === 'push'
      ? normalizePushProviderEvent(params.rawEvent, params.providerKind, receivedAt)
      : params.channel === 'in_app'
        ? normalizeProviderFailureEvent(params.rawEvent, params.providerKind, params.channel, receivedAt)
        : normalizeUnknownProviderEvent(params.rawEvent, params.providerKind, params.channel, receivedAt);

  // At-least-once callbacks must be a no-op before receipt/health side effects.
  const existingEvent = await repositories.providerEventRepository.getProviderEventById(normalized.providerEventId);
  if (existingEvent) {
    const receipt = await repositories.receiptRepository.getReceiptById(`receipt|${existingEvent.providerKind}|${existingEvent.providerEventId}`);
    return {
      providerEventId: existingEvent.providerEventId,
      receiptId: receipt?.receiptId ?? `receipt|${existingEvent.providerKind}|${existingEvent.providerEventId}`,
      correlated: existingEvent.targetId !== null || existingEvent.outboxId !== null || existingEvent.decisionId !== null,
      targetId: existingEvent.targetId,
      outboxId: existingEvent.outboxId,
      decisionId: existingEvent.decisionId,
      healthState: existingEvent.targetId ? (await repositories.targetHealthRepository.getTargetHealth(existingEvent.targetId))?.healthState ?? null : null,
      targetDisabled: false,
      eventKind: existingEvent.eventKind,
      severity: receipt?.severity ?? normalized.severity
    };
  }

  const correlated = await correlateProviderEvent(normalized, repositories);

  const providerEventRecord = {
    providerEventId: normalized.providerEventId,
    providerKind: normalized.providerKind,
    channel: normalized.channel,
    providerMessageId: normalized.providerMessageId,
    eventKind: normalized.eventKind,
    occurredAt: normalized.occurredAt,
    targetId: correlated.targetId,
    outboxId: correlated.outboxId,
    attemptId: correlated.attemptId,
    decisionId: correlated.decisionId,
    decisionKey: correlated.decisionKey,
    reasonCode: normalized.reasonCode,
    reasonMessage: normalized.reasonMessage,
    rawEventJson: normalized.rawEventJson,
    normalizedMetaJson: normalized.normalizedMetaJson,
    createdAt: receivedAt
  };
  const owned = repositories.providerEventRepository.claimProviderEvent
    ? await repositories.providerEventRepository.claimProviderEvent(providerEventRecord)
    : (await repositories.providerEventRepository.saveProviderEvent(providerEventRecord), true);
  if (!owned) {
    const winner = await repositories.providerEventRepository.getProviderEventById(normalized.providerEventId);
    if (!winner) throw new Error('provider_event_claim_incomplete');
    const winnerReceipt = await repositories.receiptRepository.getReceiptById(`receipt|${winner.providerKind}|${winner.providerEventId}`);
    if (!winnerReceipt) throw new Error('provider_event_receipt_incomplete');
    return {
      providerEventId: winner.providerEventId,
      receiptId: winnerReceipt.receiptId,
      correlated: winner.targetId !== null || winner.outboxId !== null || winner.decisionId !== null,
      targetId: winner.targetId,
      outboxId: winner.outboxId,
      decisionId: winner.decisionId,
      healthState: winner.targetId ? (await repositories.targetHealthRepository.getTargetHealth(winner.targetId))?.healthState ?? null : null,
      targetDisabled: false,
      eventKind: winner.eventKind,
      severity: winnerReceipt.severity
    };
  }

  const receipt = buildNotificationDeliveryReceipt(normalized, correlated, receivedAt);
  await repositories.receiptRepository.saveReceipt(receipt);

  let healthState: NotificationTargetHealthState | null = null;
  let targetDisabled = false;
  if (correlated.targetId) {
    const currentHealth = await repositories.targetHealthRepository.getTargetHealth(correlated.targetId);
    const target = await repositories.targetRepository.getTargetById(correlated.targetId);
    const applied = applyReceiptToTargetHealth(currentHealth, receipt, target, receivedAt);
    await repositories.targetHealthRepository.saveTargetHealth(applied.healthRecord);
    healthState = applied.healthRecord.healthState;
    if (applied.targetStatusChange === 'disabled' && target) {
      await repositories.targetRepository.updateTargetStatus(target.targetId, 'disabled', receivedAt);
      targetDisabled = true;
    }
  }

  return {
    providerEventId: normalized.providerEventId,
    receiptId: receipt.receiptId,
    correlated: correlated.targetId !== null || correlated.outboxId !== null || correlated.decisionId !== null,
    targetId: correlated.targetId,
    outboxId: correlated.outboxId,
    decisionId: correlated.decisionId,
    healthState,
    targetDisabled,
    eventKind: receipt.eventKind,
    severity: receipt.severity
  };
}
