import type { NotificationChannel } from '@elceo/types';
import type { NotificationInboxRepository } from '../persistence/contracts';
import { deliverInAppToInbox } from './in-app-delivery';
import type { NotificationDeliveryEnvelope } from './channel-contracts';
import type { NotificationOutboxRecord } from './outbox-contracts';

export type NotificationTransportResult = { success: boolean; providerMessageId: string | null; errorCode: string | null; errorMessage: string | null; responseMeta: Record<string, unknown> | null };
export type ChannelDeliveryTransport = { send(outbox: NotificationOutboxRecord, envelope: NotificationDeliveryEnvelope, deliveredAt: string): Promise<NotificationTransportResult> };
export type NotificationDeliveryTransport = { send(outbox: NotificationOutboxRecord, envelope: NotificationDeliveryEnvelope, deliveredAt: string): Promise<NotificationTransportResult> };

export class InAppInboxDeliveryTransport implements ChannelDeliveryTransport {
  constructor(private readonly repositories: { inboxRepository: NotificationInboxRepository }) {}
  async send(outbox: NotificationOutboxRecord, envelope: NotificationDeliveryEnvelope, deliveredAt: string): Promise<NotificationTransportResult> {
    const inbox = await deliverInAppToInbox(outbox, envelope, this.repositories, deliveredAt);
    return { success: true, providerMessageId: inbox.inboxId, errorCode: null, errorMessage: null, responseMeta: { inboxId: inbox.inboxId } };
  }
}

export class MemoryEmailDeliveryTransport implements ChannelDeliveryTransport {
  readonly sent: NotificationDeliveryEnvelope[] = [];
  constructor(private readonly failure?: { errorCode: string; errorMessage: string }) {}
  async send(_outbox: NotificationOutboxRecord, envelope: NotificationDeliveryEnvelope): Promise<NotificationTransportResult> {
    if (this.failure) return { success: false, providerMessageId: null, errorCode: this.failure.errorCode, errorMessage: this.failure.errorMessage, responseMeta: null };
    this.sent.push(envelope);
    return { success: true, providerMessageId: `memory|email|${this.sent.length}`, errorCode: null, errorMessage: null, responseMeta: { channel: 'email' } };
  }
}

export class MemoryPushDeliveryTransport implements ChannelDeliveryTransport {
  readonly sent: NotificationDeliveryEnvelope[] = [];
  constructor(private readonly failure?: { errorCode: string; errorMessage: string }) {}
  async send(_outbox: NotificationOutboxRecord, envelope: NotificationDeliveryEnvelope): Promise<NotificationTransportResult> {
    if (this.failure) return { success: false, providerMessageId: null, errorCode: this.failure.errorCode, errorMessage: this.failure.errorMessage, responseMeta: null };
    this.sent.push(envelope);
    return { success: true, providerMessageId: `memory|push|${this.sent.length}`, errorCode: null, errorMessage: null, responseMeta: { channel: 'push' } };
  }
}

class RoutedNotificationDeliveryTransport implements NotificationDeliveryTransport {
  constructor(private readonly routes: Record<'in_app' | 'email' | 'push', ChannelDeliveryTransport>) {}
  async send(outbox: NotificationOutboxRecord, envelope: NotificationDeliveryEnvelope, deliveredAt: string): Promise<NotificationTransportResult> {
    const channel = outbox.channel as 'in_app' | 'email' | 'push';
    return this.routes[channel].send(outbox, envelope, deliveredAt);
  }
}

export function createNotificationDeliveryTransport(
  _env: Record<string, string | undefined>,
  deps: { inboxRepository: NotificationInboxRepository; memoryFailureByChannel?: Partial<Record<NotificationChannel, { errorCode: string; errorMessage: string }>> }
): NotificationDeliveryTransport {
  return new RoutedNotificationDeliveryTransport({
    in_app: new InAppInboxDeliveryTransport({ inboxRepository: deps.inboxRepository }),
    email: new MemoryEmailDeliveryTransport(deps.memoryFailureByChannel?.email),
    push: new MemoryPushDeliveryTransport(deps.memoryFailureByChannel?.push)
  });
}
