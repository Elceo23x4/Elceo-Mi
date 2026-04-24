import type { NotificationDeliveryProviderConfig, NotificationProviderCapabilitiesSummary, NotificationProviderCapability } from './config';

function buildCapability(channel: NotificationProviderCapability['channel'], providerKind: NotificationProviderCapability['providerKind'], enabled: boolean, reason: string | null): NotificationProviderCapability {
  return { channel, providerKind, enabled, reason };
}

export function getNotificationProviderCapabilities(config: NotificationDeliveryProviderConfig): NotificationProviderCapabilitiesSummary {
  const inApp = buildCapability('in_app', config.inAppProvider, config.inAppProvider === 'in_app' || config.inAppProvider === 'memory', config.inAppProvider === 'unsupported' ? 'provider_disabled_by_env' : 'configured');

  const emailReason = config.emailProvider === 'unsupported'
    ? 'missing_required_config'
    : config.emailProvider === 'smtp_email' && !(config.smtpHost && config.smtpUser && config.smtpPassword && config.emailFromAddress)
      ? 'missing_required_config'
      : config.emailProvider === 'http_email' && !(config.httpEmailEndpoint && config.httpEmailApiKey && config.emailFromAddress)
        ? 'missing_required_config'
        : config.emailProvider === 'smtp_email'
          ? 'unsupported_in_current_runtime'
          : 'configured';
  const email = buildCapability('email', config.emailProvider, emailReason === 'configured', emailReason);

  const pushReason = config.pushProvider === 'web_push' && config.webPushEndpoint && config.webPushApiKey
    ? 'unsupported_in_current_runtime'
    : config.pushProvider === 'unsupported'
      ? 'missing_required_config'
      : 'missing_required_config';
  const push = buildCapability('push', config.pushProvider, false, pushReason);

  return { inApp, email, push };
}
