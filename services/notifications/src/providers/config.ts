import type { NotificationChannel } from '@elceo/types';

export type NotificationProviderKind = 'memory' | 'in_app' | 'smtp_email' | 'http_email' | 'web_push' | 'unsupported';

export type NotificationDeliveryProviderConfig = {
  inAppProvider: NotificationProviderKind;
  emailProvider: NotificationProviderKind;
  pushProvider: NotificationProviderKind;
  emailFromAddress: string | null;
  emailFromName: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  smtpSecure: boolean;
  httpEmailEndpoint: string | null;
  httpEmailApiKey: string | null;
  webPushEndpoint: string | null;
  webPushApiKey: string | null;
};

const parseProviderKind = (value: string | undefined, fallback: NotificationProviderKind): NotificationProviderKind => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase() as NotificationProviderKind;
  if (['memory', 'in_app', 'smtp_email', 'http_email', 'web_push', 'unsupported'].includes(normalized)) return normalized;
  return 'unsupported';
};

const isProdLike = (env: Record<string, string | undefined>): boolean => {
  const nodeEnv = (env.NODE_ENV ?? '').toLowerCase();
  return nodeEnv === 'production' || nodeEnv === 'staging';
};

export function getNotificationDeliveryProviderConfig(env: Record<string, string | undefined>): NotificationDeliveryProviderConfig {
  const smtpHost = env.NOTIFICATION_SMTP_HOST?.trim() || null;
  const smtpUser = env.NOTIFICATION_SMTP_USER?.trim() || null;
  const smtpPassword = env.NOTIFICATION_SMTP_PASSWORD?.trim() || null;
  const smtpPort = env.NOTIFICATION_SMTP_PORT ? Number(env.NOTIFICATION_SMTP_PORT) : null;
  const httpEmailEndpoint = env.NOTIFICATION_HTTP_EMAIL_ENDPOINT?.trim() || null;
  const httpEmailApiKey = env.NOTIFICATION_HTTP_EMAIL_API_KEY?.trim() || null;
  const webPushEndpoint = env.NOTIFICATION_WEB_PUSH_ENDPOINT?.trim() || null;
  const webPushApiKey = env.NOTIFICATION_WEB_PUSH_API_KEY?.trim() || null;

  const emailProvider = parseProviderKind(
    env.NOTIFICATION_EMAIL_PROVIDER,
    smtpHost && smtpUser && smtpPassword
      ? 'smtp_email'
      : httpEmailEndpoint && httpEmailApiKey
        ? 'http_email'
        : isProdLike(env)
          ? 'unsupported'
          : 'memory'
  );

  const pushProvider = parseProviderKind(
    env.NOTIFICATION_PUSH_PROVIDER,
    webPushEndpoint && webPushApiKey ? 'web_push' : 'unsupported'
  );

  return {
    inAppProvider: parseProviderKind(env.NOTIFICATION_IN_APP_PROVIDER, 'in_app'),
    emailProvider,
    pushProvider,
    emailFromAddress: env.NOTIFICATION_EMAIL_FROM_ADDRESS?.trim() || null,
    emailFromName: env.NOTIFICATION_EMAIL_FROM_NAME?.trim() || null,
    smtpHost,
    smtpPort: Number.isFinite(smtpPort) ? smtpPort : null,
    smtpUser,
    smtpPassword,
    smtpSecure: (env.NOTIFICATION_SMTP_SECURE ?? 'false').toLowerCase() === 'true',
    httpEmailEndpoint,
    httpEmailApiKey,
    webPushEndpoint,
    webPushApiKey
  };
}

export type NotificationProviderCapability = { channel: NotificationChannel; providerKind: NotificationProviderKind; enabled: boolean; reason: string | null };
export type NotificationProviderCapabilitiesSummary = { inApp: NotificationProviderCapability; email: NotificationProviderCapability; push: NotificationProviderCapability };
