import type { NotificationDeliveryRuntimeRepositories } from '../persistence/contracts';

export type NotificationRuntimeHealthSummary = {
  asOfIso: string;
  lookbackHours: number;
  stagedCount: number;
  dispatchingCount: number;
  deliveredCount: number;
  failedCount: number;
  deadCount: number;
  pendingVerificationCount: number;
  staleDispatchingCount: number;
  nearExpiryVerificationCount: number;
};

export async function listStuckDispatchingOutbox(
  repositories: NotificationDeliveryRuntimeRepositories,
  asOfIso?: string,
  olderThanMinutes = 30
) {
  const asOf = asOfIso ?? new Date().toISOString();
  const rows = await repositories.outboxRepository.listRecentOutboxItems(asOf, null, 2000);
  const threshold = Date.parse(asOf) - olderThanMinutes * 60_000;
  return rows
    .filter((row) => row.status === 'dispatching' && Date.parse(row.updatedAt) <= threshold)
    .sort((left, right) => Date.parse(left.updatedAt) - Date.parse(right.updatedAt) || left.outboxId.localeCompare(right.outboxId));
}

export async function listPendingVerificationsNearExpiry(
  repositories: NotificationDeliveryRuntimeRepositories,
  asOfIso?: string,
  withinMinutes = 60
) {
  const asOf = asOfIso ?? new Date().toISOString();
  const cutoff = new Date(Date.parse(asOf) + withinMinutes * 60_000).toISOString();
  const rows = await repositories.verificationRepository.listPendingVerificationsExpiringBefore(cutoff);
  return rows
    .filter((row) => Date.parse(row.expiresAt) >= Date.parse(asOf))
    .sort((left, right) => Date.parse(left.expiresAt) - Date.parse(right.expiresAt) || left.verificationId.localeCompare(right.verificationId));
}

export async function summarizeNotificationRuntimeHealth(
  repositories: NotificationDeliveryRuntimeRepositories,
  asOfIso?: string,
  lookbackHours = 24
): Promise<NotificationRuntimeHealthSummary> {
  const asOf = asOfIso ?? new Date().toISOString();
  const recentOutbox = await repositories.outboxRepository.listRecentOutboxItems(asOf, lookbackHours, 2000);
  const staleDispatching = await listStuckDispatchingOutbox(repositories, asOf, 30);
  const nearExpiry = await listPendingVerificationsNearExpiry(repositories, asOf, 60);
  const pendingVerificationCount = (await repositories.verificationRepository.listPendingVerificationsExpiringBefore('9999-12-31T00:00:00.000Z')).length;

  return {
    asOfIso: asOf,
    lookbackHours,
    stagedCount: recentOutbox.filter((row) => row.status === 'staged').length,
    dispatchingCount: recentOutbox.filter((row) => row.status === 'dispatching').length,
    deliveredCount: recentOutbox.filter((row) => row.status === 'delivered').length,
    failedCount: recentOutbox.filter((row) => row.status === 'failed').length,
    deadCount: recentOutbox.filter((row) => row.status === 'dead').length,
    pendingVerificationCount,
    staleDispatchingCount: staleDispatching.length,
    nearExpiryVerificationCount: nearExpiry.length
  };
}
