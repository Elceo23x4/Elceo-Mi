import type { NotificationChannel } from '@elceo/types';
import type { NotificationDeliveryChannelPayload } from './channel-contracts';

export type NotificationTransportResult = {
  success: boolean;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  responseMeta: Record<string, unknown> | null;
};

export type NotificationDeliveryTransport = {
  send(channel: NotificationChannel, payload: NotificationDeliveryChannelPayload): Promise<NotificationTransportResult>;
};

export type MemorySentMessage = {
  channel: NotificationChannel;
  payload: NotificationDeliveryChannelPayload;
  sentAt: string;
};

export class MemoryNotificationDeliveryTransport implements NotificationDeliveryTransport {
  readonly sentMessages: MemorySentMessage[] = [];
  constructor(private readonly failureByChannel: Partial<Record<NotificationChannel, { errorCode: string; errorMessage: string }>> = {}) {}

  async send(channel: NotificationChannel, payload: NotificationDeliveryChannelPayload): Promise<NotificationTransportResult> {
    const failure = this.failureByChannel[channel];
    if (failure) {
      return { success: false, providerMessageId: null, errorCode: failure.errorCode, errorMessage: failure.errorMessage, responseMeta: { channel } };
    }

    this.sentMessages.push({ channel, payload, sentAt: new Date().toISOString() });
    return {
      success: true,
      providerMessageId: `memory|${channel}|${this.sentMessages.length}`,
      errorCode: null,
      errorMessage: null,
      responseMeta: { channel, sentCount: this.sentMessages.length }
    };
  }
}

export function createNotificationDeliveryTransport(
  env: Record<string, string | undefined>,
  deps?: { memoryFailureByChannel?: Partial<Record<NotificationChannel, { errorCode: string; errorMessage: string }>> }
): NotificationDeliveryTransport {
  if (env.NOTIFICATION_DELIVERY_TRANSPORT === 'memory' || !env.NOTIFICATION_DELIVERY_TRANSPORT) {
    return new MemoryNotificationDeliveryTransport(deps?.memoryFailureByChannel);
  }
  return new MemoryNotificationDeliveryTransport(deps?.memoryFailureByChannel);
}
