import type { NotificationChannel } from '@elceo/types';
import type { NotificationInboxRepository } from '../persistence/contracts';
import { deliverInAppToInbox } from './in-app-delivery';
import type { NotificationDeliveryEnvelope } from './channel-contracts';
import type { NotificationOutboxRecord } from './outbox-contracts';
import { getNotificationProviderCapabilities } from '../providers/capabilities';
import { getNotificationDeliveryProviderConfig } from '../providers/config';

export type NotificationDeliveryErrorCode =
  | 'payload_deserialization_failed'
  | 'target_channel_mismatch'
  | 'target_not_active'
  | 'provider_not_configured'
  | 'provider_unsupported'
  | 'provider_auth_failed'
  | 'provider_rejected'
  | 'provider_network_error'
  | 'provider_timeout'
  | 'unknown_delivery_error';

export type NotificationTransportResult = { success: boolean; providerMessageId: string | null; errorCode: NotificationDeliveryErrorCode | null; errorMessage: string | null; responseMeta: Record<string, unknown> | null };
export type ChannelDeliveryTransport = { send(outbox: NotificationOutboxRecord, envelope: NotificationDeliveryEnvelope, deliveredAt: string): Promise<NotificationTransportResult> };
export type NotificationDeliveryTransport = { send(outbox: NotificationOutboxRecord, envelope: NotificationDeliveryEnvelope, deliveredAt: string): Promise<NotificationTransportResult> };

export class InAppInboxDeliveryTransport implements ChannelDeliveryTransport {
  constructor(private readonly repositories: { inboxRepository: NotificationInboxRepository }) {}
  async send(outbox: NotificationOutboxRecord, envelope: NotificationDeliveryEnvelope, deliveredAt: string): Promise<NotificationTransportResult> {
    const inbox = await deliverInAppToInbox(outbox, envelope, this.repositories, deliveredAt);
    return { success: true, providerMessageId: inbox.inboxId, errorCode: null, errorMessage: null, responseMeta: { inboxId: inbox.inboxId, providerKind: 'in_app' } };
  }
}

export class MemoryEmailDeliveryTransport implements ChannelDeliveryTransport {
  readonly sent: NotificationDeliveryEnvelope[] = [];
  constructor(private readonly failure?: { errorCode: NotificationDeliveryErrorCode; errorMessage: string }) {}
  async send(_outbox: NotificationOutboxRecord, envelope: NotificationDeliveryEnvelope): Promise<NotificationTransportResult> {
    if (this.failure) return { success: false, providerMessageId: null, errorCode: this.failure.errorCode, errorMessage: this.failure.errorMessage, responseMeta: null };
    this.sent.push(envelope);
    return { success: true, providerMessageId: `memory|email|${this.sent.length}`, errorCode: null, errorMessage: null, responseMeta: { channel: 'email', providerKind: 'memory' } };
  }
}

class UnsupportedTransport implements ChannelDeliveryTransport {
  constructor(private readonly code: NotificationDeliveryErrorCode, private readonly message: string) {}
  async send(): Promise<NotificationTransportResult> { return { success: false, providerMessageId: null, errorCode: this.code, errorMessage: this.message, responseMeta: null }; }
}

class HttpEmailDeliveryTransport implements ChannelDeliveryTransport {
  constructor(private readonly endpoint: string, private readonly apiKey: string, private readonly fromAddress: string, private readonly fromName: string | null) {}

  async send(_outbox: NotificationOutboxRecord, envelope: NotificationDeliveryEnvelope): Promise<NotificationTransportResult> {
    try {
      const address = JSON.parse(envelope.addressJson) as { email?: string };
      if (!address.email) return { success: false, providerMessageId: null, errorCode: 'provider_rejected', errorMessage: 'missing_recipient_email', responseMeta: null };
      const payload = {
        from: { email: this.fromAddress, name: this.fromName },
        to: [{ email: address.email }],
        subject: 'subject' in envelope.payload ? envelope.payload.subject : 'ELCEO Notification',
        text: envelope.payload.body,
        metadata: { decisionId: envelope.payload.decisionId, ruleKey: envelope.payload.ruleKey }
      };
      const response = await fetch(this.endpoint, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` }, body: JSON.stringify(payload) });
      const bodyText = await response.text();
      if (response.status === 401 || response.status === 403) return { success: false, providerMessageId: null, errorCode: 'provider_auth_failed', errorMessage: `http_${response.status}`, responseMeta: { body: bodyText } };
      if (!response.ok) return { success: false, providerMessageId: null, errorCode: 'provider_rejected', errorMessage: `http_${response.status}`, responseMeta: { body: bodyText } };
      const messageId = response.headers.get('x-message-id') ?? response.headers.get('x-request-id');
      return { success: true, providerMessageId: messageId, errorCode: null, errorMessage: null, responseMeta: { status: response.status, providerKind: 'http_email' } };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      return { success: false, providerMessageId: null, errorCode: 'provider_network_error', errorMessage: message, responseMeta: null };
    }
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
  env: Record<string, string | undefined>,
  deps: { inboxRepository: NotificationInboxRepository; memoryFailureByChannel?: Partial<Record<NotificationChannel, { errorCode: NotificationDeliveryErrorCode; errorMessage: string }>> }
): NotificationDeliveryTransport {
  const config = getNotificationDeliveryProviderConfig(env);
  const capabilities = getNotificationProviderCapabilities(config);

  const emailTransport: ChannelDeliveryTransport = capabilities.email.enabled
    ? config.emailProvider === 'http_email' && config.httpEmailEndpoint && config.httpEmailApiKey && config.emailFromAddress
      ? new HttpEmailDeliveryTransport(config.httpEmailEndpoint, config.httpEmailApiKey, config.emailFromAddress, config.emailFromName)
      : config.emailProvider === 'memory'
        ? new MemoryEmailDeliveryTransport(deps.memoryFailureByChannel?.email)
        : new UnsupportedTransport('provider_unsupported', capabilities.email.reason ?? 'provider_unsupported')
    : new UnsupportedTransport(capabilities.email.reason === 'missing_required_config' ? 'provider_not_configured' : 'provider_unsupported', capabilities.email.reason ?? 'provider_not_configured');

  const pushTransport: ChannelDeliveryTransport = new UnsupportedTransport(
    capabilities.push.reason === 'missing_required_config' ? 'provider_not_configured' : 'provider_unsupported',
    capabilities.push.reason ?? 'provider_unsupported'
  );

  return new RoutedNotificationDeliveryTransport({
    in_app: new InAppInboxDeliveryTransport({ inboxRepository: deps.inboxRepository }),
    email: emailTransport,
    push: pushTransport
  });
}
