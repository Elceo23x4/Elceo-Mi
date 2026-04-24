import type { NotificationChannel } from '@elceo/types';

export function buildNotificationDeliveryKey(decisionId: string, channel: NotificationChannel, targetKey: string): string {
  return `delivery|${decisionId}|${channel}|${targetKey}`;
}

export function buildNotificationOutboxKey(decisionKey: string, channel: NotificationChannel, targetKey: string): string {
  return `outbox|${decisionKey}|${channel}|${targetKey}`;
}
