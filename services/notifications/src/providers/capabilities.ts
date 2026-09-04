import type { NotificationDeliveryProviderConfig, NotificationProviderCapabilitiesSummary, NotificationProviderCapability } from './config';

const cap = (channel: NotificationProviderCapability['channel'], providerKind: NotificationProviderCapability['providerKind'], enabled: boolean): NotificationProviderCapability => ({ channel, providerKind, enabled, reason: enabled ? 'configured' : 'missing_required_config' });

export function getNotificationProviderCapabilities(c: NotificationDeliveryProviderConfig): NotificationProviderCapabilitiesSummary {
  const emailReady = c.emailProvider === 'memory' || Boolean(c.emailFromAddress && (c.emailProvider === 'resend' ? c.resendApiKey : c.emailProvider === 'postmark' ? c.postmarkServerToken : false));
  const pushReady = c.pushProvider === 'onesignal_web_push' && Boolean(c.oneSignalAppId && c.oneSignalApiKey);
  return { inApp: cap('in_app', c.inAppProvider, true), email: cap('email', c.emailProvider, emailReady), push: cap('push', c.pushProvider, pushReady) };
}
