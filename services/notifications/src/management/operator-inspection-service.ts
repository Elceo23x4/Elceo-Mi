import type { NotificationOutboxAttemptRepository, NotificationOutboxRepository } from '../persistence/contracts';
import type { NotificationOutboxRecord } from '../delivery/outbox-contracts';
import { redactNotificationPreview } from './redaction';

export type NotificationOperatorInspectionSummary = {
  asOfIso: string;
  pendingStagedCount: number;
  dispatchingCount: number;
  failedRetryableCount: number;
  deadExhaustedCount: number;
  deliveredCount: number;
  oldestPendingItem: string | null;
  oldestDispatchingItem: string | null;
  recentProviderFailures: Array<{ outboxId: string; errorCode: string | null; errorMessage: string | null }>;
  recentPermanentFailures: Array<{ outboxId: string; errorCode: string | null; errorMessage: string | null }>;
  recentDeadLetterItems: string[];
};

export class NotificationOperatorInspectionService {
  constructor(private readonly deps: { outboxRepository: NotificationOutboxRepository; outboxAttemptRepository: NotificationOutboxAttemptRepository }) {}

  async getSummary(asOfIso: string, lookbackHours: number | null = null): Promise<NotificationOperatorInspectionSummary> {
    const rows = await this.deps.outboxRepository.listRecentOutboxItems(asOfIso, lookbackHours, 5000);
    const byCreated = (items: NotificationOutboxRecord[]) => [...items].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.outboxId.localeCompare(b.outboxId));
    return {
      asOfIso,
      pendingStagedCount: rows.filter((row) => row.status === 'staged').length,
      dispatchingCount: rows.filter((row) => row.status === 'dispatching').length,
      failedRetryableCount: rows.filter((row) => row.status === 'failed').length,
      deadExhaustedCount: rows.filter((row) => row.status === 'dead').length,
      deliveredCount: rows.filter((row) => row.status === 'delivered').length,
      oldestPendingItem: byCreated(rows.filter((row) => row.status === 'staged'))[0]?.outboxId ?? null,
      oldestDispatchingItem: byCreated(rows.filter((row) => row.status === 'dispatching'))[0]?.outboxId ?? null,
      recentProviderFailures: rows.filter((row) => row.status === 'failed').slice(0, 10).map((row) => ({ outboxId: row.outboxId, errorCode: row.lastErrorCode, errorMessage: row.lastErrorMessage })),
      recentPermanentFailures: rows.filter((row) => row.status === 'dead').slice(0, 10).map((row) => ({ outboxId: row.outboxId, errorCode: row.lastErrorCode, errorMessage: row.lastErrorMessage })),
      recentDeadLetterItems: rows.filter((row) => row.status === 'dead').slice(0, 10).map((row) => row.outboxId)
    };
  }

  async getOutboxInspection(outboxId: string) {
    const row = await this.deps.outboxRepository.getOutboxById(outboxId);
    if (!row) return null;
    return {
      outboxId: row.outboxId,
      status: row.status,
      attemptCount: row.attemptCount,
      attempts: await this.deps.outboxAttemptRepository.listAttemptsForOutbox(outboxId),
      safePayloadPreview: redactNotificationPreview(row.payloadJson),
      safeTargetPreview: redactNotificationPreview(row.deliveryAddressJson)
    };
  }
}
