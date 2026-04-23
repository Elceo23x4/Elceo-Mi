import type { NotificationChannel } from '@elceo/types';

export function buildNotificationDeliveryKey(decisionId: string, channel: NotificationChannel): string {
  return `delivery|${decisionId}|${channel}`;
}

export function buildNotificationOutboxKey(decisionKey: string, channel: NotificationChannel): string {
  return `outbox|${decisionKey}|${channel}`;
}
