import type { NotificationChannel } from '@elceo/types';

export type NotificationProviderKind = 'memory' | 'in_app' | 'resend' | 'postmark' | 'onesignal_web_push' | 'unsupported';

export type NotificationDeliveryProviderConfig = {
  inAppProvider: NotificationProviderKind;
  emailProvider: NotificationProviderKind;
  pushProvider: NotificationProviderKind;
  emailFromAddress: string | null;
  emailFromName: string | null;
  emailReplyTo: string | null;
  resendApiKey: string | null;
  postmarkServerToken: string | null;
  postmarkMessageStream: string;
  oneSignalAppId: string | null;
  oneSignalApiKey: string | null;
  requestTimeoutMs: number;
};

const clean = (value: string | undefined): string | null => {
  const result = value?.trim() || null;
  if (!result || /^(change[-_ ]?me|example|placeholder|todo|xxx)/i.test(result)) return null;
  return result;
};

export function getNotificationDeliveryProviderConfig(env: Record<string, string | undefined>): NotificationDeliveryProviderConfig {
  const email = (env.NOTIFICATION_EMAIL_PROVIDER?.trim().toLowerCase() || (env.NODE_ENV === 'production' ? 'unsupported' : 'memory')) as NotificationProviderKind;
  const push = (env.NOTIFICATION_PUSH_PROVIDER?.trim().toLowerCase() || 'unsupported') as NotificationProviderKind;
  const serverAppId = clean(env.ONESIGNAL_APP_ID);
  const publicAppId = clean(env.NEXT_PUBLIC_ONESIGNAL_APP_ID);
  const oneSignalApiKey = clean(env.ONESIGNAL_APP_API_KEY);
  if (push === 'onesignal_web_push' && (!serverAppId || !publicAppId || !oneSignalApiKey || serverAppId !== publicAppId)) {
    throw new Error('onesignal_configuration_invalid');
  }
  return {
    inAppProvider: 'in_app',
    emailProvider: ['memory', 'resend', 'postmark'].includes(email) ? email : 'unsupported',
    pushProvider: push === 'onesignal_web_push' ? push : 'unsupported',
    emailFromAddress: clean(env.NOTIFICATION_EMAIL_FROM_ADDRESS),
    emailFromName: clean(env.NOTIFICATION_EMAIL_FROM_NAME),
    emailReplyTo: clean(env.NOTIFICATION_EMAIL_REPLY_TO),
    resendApiKey: clean(env.RESEND_API_KEY),
    postmarkServerToken: clean(env.POSTMARK_SERVER_TOKEN),
    postmarkMessageStream: clean(env.POSTMARK_MESSAGE_STREAM) ?? 'outbound',
    oneSignalAppId: serverAppId,
    oneSignalApiKey,
    requestTimeoutMs: Math.min(30_000, Math.max(1_000, Number(env.NOTIFICATION_PROVIDER_TIMEOUT_MS) || 10_000))
  };
}

export type NotificationProviderCapability = { channel: NotificationChannel; providerKind: NotificationProviderKind; enabled: boolean; reason: string | null };
export type NotificationProviderCapabilitiesSummary = { inApp: NotificationProviderCapability; email: NotificationProviderCapability; push: NotificationProviderCapability };
