import type { NotificationDeliveryReceipt, NotificationTargetHealthRecord, NotificationTargetRecord } from '@elceo/types';

export type TargetHealthApplyResult = {
  healthRecord: NotificationTargetHealthRecord;
  targetStatusChange: NotificationTargetRecord['status'] | null;
};

export function createDefaultTargetHealth(targetId: string, nowIso: string): NotificationTargetHealthRecord {
  return {
    targetId,
    healthState: 'healthy',
    lastReceiptKind: null,
    lastReceiptAt: null,
    softFailureCount: 0,
    hardFailureCount: 0,
    complaintCount: 0,
    unsubscribeCount: 0,
    invalidTargetCount: 0,
    updatedAt: nowIso
  };
}

export function applyReceiptToTargetHealth(existingHealth: NotificationTargetHealthRecord | null, receipt: NotificationDeliveryReceipt, targetRecord: NotificationTargetRecord | null, nowIso: string): TargetHealthApplyResult {
  const current = existingHealth ?? createDefaultTargetHealth(receipt.targetId ?? targetRecord?.targetId ?? 'unknown_target', nowIso);
  const receiptIsCanonicalLatest = current.lastReceiptAt === null
    || receipt.occurredAt > current.lastReceiptAt
    || (receipt.occurredAt === current.lastReceiptAt && receipt.eventKind > (current.lastReceiptKind ?? ''));
  const next: NotificationTargetHealthRecord = { ...current, ...(receiptIsCanonicalLatest ? { lastReceiptKind: receipt.eventKind, lastReceiptAt: receipt.occurredAt } : {}), updatedAt: nowIso };
  let targetStatusChange: NotificationTargetRecord['status'] | null = null;

  if (receipt.eventKind === 'provider_failed') {
    next.softFailureCount += 1;
    if (next.softFailureCount >= 5) next.healthState = 'degraded';
    else if (next.softFailureCount >= 3 && next.healthState === 'healthy') next.healthState = 'warning';
  }
  if (receipt.eventKind === 'bounced') {
    next.hardFailureCount += 1;
    if (next.hardFailureCount === 1) next.healthState = 'warning';
    if (next.hardFailureCount === 2) next.healthState = 'degraded';
    if (next.hardFailureCount >= 3) {
      next.healthState = 'disabled';
      targetStatusChange = 'disabled';
    }
  }
  if (receipt.eventKind === 'complained') {
    next.complaintCount += 1;
    next.healthState = 'disabled';
    targetStatusChange = 'disabled';
  }
  if (receipt.eventKind === 'unsubscribed') {
    next.unsubscribeCount += 1;
    next.healthState = 'disabled';
    targetStatusChange = 'disabled';
  }
  if (receipt.eventKind === 'invalid_target') {
    next.invalidTargetCount += 1;
    next.healthState = 'disabled';
    targetStatusChange = 'disabled';
  }
  if (receipt.eventKind === 'accepted' || receipt.eventKind === 'delivered') {
    if (!next.healthState) next.healthState = 'healthy';
  }

  if (!targetRecord) targetStatusChange = null;
  return { healthRecord: next, targetStatusChange };
}
