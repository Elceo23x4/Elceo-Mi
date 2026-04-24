import type { NotificationOutboxRepository } from '../persistence/contracts';
import { getNotificationProviderCapabilities } from './capabilities';
import { getNotificationDeliveryProviderConfig } from './config';

export function getNotificationProviderCapabilitiesFromEnv(env: Record<string, string | undefined>) {
  return getNotificationProviderCapabilities(getNotificationDeliveryProviderConfig(env));
}

export async function getNotificationDeliveryOperationalSummary(
  outboxRepository: NotificationOutboxRepository,
  env: Record<string, string | undefined>,
  asOfIso = new Date().toISOString(),
  lookbackHours = 24
) {
  const recent = await outboxRepository.listRecentOutboxItems(asOfIso, lookbackHours, 2000);
  return {
    providerCapabilities: getNotificationProviderCapabilitiesFromEnv(env),
    deliveredCount: recent.filter((row) => row.status === 'delivered').length,
    failedCount: recent.filter((row) => row.status === 'failed').length,
    deadCount: recent.filter((row) => row.status === 'dead').length,
    stagedCount: recent.filter((row) => row.status === 'staged').length,
    dispatchingCount: recent.filter((row) => row.status === 'dispatching').length,
    inboxDeliveredCount: recent.filter((row) => row.channel === 'in_app' && row.status === 'delivered').length,
    emailDeliveredCount: recent.filter((row) => row.channel === 'email' && row.status === 'delivered').length,
    pushDeliveredCount: recent.filter((row) => row.channel === 'push' && row.status === 'delivered').length
  };
}
