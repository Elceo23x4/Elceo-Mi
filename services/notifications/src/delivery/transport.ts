import type { NotificationChannel } from '@elceo/types';
import type { NotificationInboxRepository } from '../persistence/contracts';
import { deliverInAppToInbox } from './in-app-delivery';
import type { NotificationDeliveryEnvelope } from './channel-contracts';
import type { NotificationOutboxRecord } from './outbox-contracts';
import { getNotificationProviderCapabilities } from '../providers/capabilities';
import { getNotificationDeliveryProviderConfig } from '../providers/config';
import { assertNotificationProviderModeAllowed, getNotificationProviderMode } from '../providers/modes';
import { OneSignalWebPushDeliveryTransport, PostmarkEmailDeliveryTransport, ResendEmailDeliveryTransport } from '../providers/production-transports';

export type NotificationDeliveryOutcome =
  | 'accepted'
  | 'delivered_receipt'
  | 'temporary_failure'
  | 'permanent_failure'
  | 'rate_limited'
  | 'provider_timeout'
  | 'provider_ambiguous'
  | 'provider_unavailable'
  | 'invalid_target'
  | 'unsubscribed_or_disabled';

export type NotificationDeliveryErrorCode =
  | 'payload_deserialization_failed'
  | 'target_channel_mismatch'
  | 'target_not_active'
  | 'unsubscribed_or_disabled'
  | 'rate_limited'
  | 'provider_ambiguous'
  | 'invalid_target'
  | 'provider_not_configured'
  | 'provider_unsupported'
  | 'provider_auth_failed'
  | 'provider_rejected'
  | 'provider_network_error'
  | 'provider_timeout'
  | 'invalid_idempotency_key'
  | 'invalid_idempotent_request'
  | 'concurrent_idempotent_requests'
  | 'unknown_delivery_error';

export type NotificationTransportResult = { success: boolean; outcome?: NotificationDeliveryOutcome; retryable?: boolean; providerMessageId: string | null; errorCode: NotificationDeliveryErrorCode | null; errorMessage: string | null; responseMeta: Record<string, unknown> | null };
export type ChannelDeliveryTransport = { send(outbox: NotificationOutboxRecord, envelope: NotificationDeliveryEnvelope, deliveredAt: string): Promise<NotificationTransportResult> };
export type NotificationDeliveryTransport = { send(outbox: NotificationOutboxRecord, envelope: NotificationDeliveryEnvelope, deliveredAt: string): Promise<NotificationTransportResult> };

export class InAppInboxDeliveryTransport implements ChannelDeliveryTransport {
  constructor(private readonly repositories: { inboxRepository: NotificationInboxRepository }) {}
  async send(outbox: NotificationOutboxRecord, envelope: NotificationDeliveryEnvelope, deliveredAt: string): Promise<NotificationTransportResult> {
    const inbox = await deliverInAppToInbox(outbox, envelope, this.repositories, deliveredAt);
    return { success: true, outcome: 'delivered_receipt', retryable: false, providerMessageId: inbox.inboxId, errorCode: null, errorMessage: null, responseMeta: { inboxId: inbox.inboxId, providerKind: 'in_app' } };
  }
}

export class MemoryEmailDeliveryTransport implements ChannelDeliveryTransport {
  readonly sent: NotificationDeliveryEnvelope[] = [];
  constructor(private readonly failure?: { errorCode: NotificationDeliveryErrorCode; errorMessage: string }) {}
  async send(_outbox: NotificationOutboxRecord, envelope: NotificationDeliveryEnvelope): Promise<NotificationTransportResult> {
    if (this.failure) return { success: false, outcome: this.failure.errorCode === 'rate_limited' ? 'rate_limited' : 'temporary_failure', retryable: true, providerMessageId: null, errorCode: this.failure.errorCode, errorMessage: this.failure.errorMessage, responseMeta: null };
    this.sent.push(envelope);
    return { success: true, outcome: 'accepted', retryable: false, providerMessageId: `memory|email|${this.sent.length}`, errorCode: null, errorMessage: null, responseMeta: { channel: 'email', providerKind: 'memory' } };
  }
}

class UnsupportedTransport implements ChannelDeliveryTransport {
  constructor(private readonly code: NotificationDeliveryErrorCode, private readonly message: string) {}
  async send(): Promise<NotificationTransportResult> { return { success: false, outcome: 'provider_unavailable', retryable: true, providerMessageId: null, errorCode: this.code, errorMessage: this.message, responseMeta: null }; }
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
  assertNotificationProviderModeAllowed(env);
  const mode = getNotificationProviderMode(env);
  const config = getNotificationDeliveryProviderConfig(env);
  if (mode === 'disabled') {
    const disabled = new UnsupportedTransport('provider_not_configured', 'notification_provider_disabled');
    return new RoutedNotificationDeliveryTransport({ in_app: disabled, email: disabled, push: disabled });
  }
  const capabilities = getNotificationProviderCapabilities(config);

  const emailTransport: ChannelDeliveryTransport = capabilities.email.enabled
    ? config.emailProvider === 'resend' && config.resendApiKey && config.emailFromAddress
      ? new ResendEmailDeliveryTransport(config.resendApiKey, config.emailFromAddress, config.emailFromName, config.emailReplyTo, config.requestTimeoutMs)
      : config.emailProvider === 'postmark' && config.postmarkServerToken && config.emailFromAddress
        ? new PostmarkEmailDeliveryTransport(config.postmarkServerToken, config.emailFromAddress, config.emailFromName, config.emailReplyTo, config.postmarkMessageStream, config.requestTimeoutMs)
        : config.emailProvider === 'memory'
        ? new MemoryEmailDeliveryTransport(deps.memoryFailureByChannel?.email)
        : new UnsupportedTransport('provider_unsupported', capabilities.email.reason ?? 'provider_unsupported')
    : new UnsupportedTransport(capabilities.email.reason === 'missing_required_config' ? 'provider_not_configured' : 'provider_unsupported', capabilities.email.reason ?? 'provider_not_configured');

  const pushTransport: ChannelDeliveryTransport = capabilities.push.enabled && config.oneSignalAppId && config.oneSignalApiKey
    ? new OneSignalWebPushDeliveryTransport(config.oneSignalAppId, config.oneSignalApiKey, config.requestTimeoutMs)
    : new UnsupportedTransport(capabilities.push.reason === 'missing_required_config' ? 'provider_not_configured' : 'provider_unsupported', capabilities.push.reason ?? 'provider_unsupported');

  return new RoutedNotificationDeliveryTransport({
    in_app: new InAppInboxDeliveryTransport({ inboxRepository: deps.inboxRepository }),
    email: emailTransport,
    push: pushTransport
  });
}
