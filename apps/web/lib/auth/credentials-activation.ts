export type CredentialsActivation = { enabled: boolean; resetBaseUrl: URL | null };
export function resolveCredentialsActivation(env: Record<string, string | undefined>): CredentialsActivation {
  const raw = env.AUTH_CREDENTIALS_ENABLED;
  if (raw !== undefined && raw !== 'true' && raw !== 'false') throw new Error('AUTH_CREDENTIALS_ENABLED must be true or false');
  const enabled = raw === 'true';
  if (!enabled) return { enabled: false, resetBaseUrl: null };
  let resetBaseUrl: URL;
  try { resetBaseUrl = new URL(env.NEXT_PUBLIC_APP_BASE_URL ?? ''); } catch { throw new Error('NEXT_PUBLIC_APP_BASE_URL must be an absolute URL when credentials authentication is enabled'); }
  if (env.APP_ENV === 'production' && resetBaseUrl.protocol !== 'https:') throw new Error('NEXT_PUBLIC_APP_BASE_URL must use https in production credentials authentication');
  if (env.APP_ENV === 'production') {
    if (!env.REDIS_URL) throw new Error('REDIS_URL must be configured when production credentials authentication is enabled');
    const providerReady = env.NOTIFICATION_EMAIL_PROVIDER === 'resend' ? Boolean(env.RESEND_API_KEY) : env.NOTIFICATION_EMAIL_PROVIDER === 'postmark' ? Boolean(env.POSTMARK_SERVER_TOKEN) : false;
    if (!providerReady || !env.NOTIFICATION_EMAIL_FROM_ADDRESS) throw new Error('Transactional email must be configured when production credentials authentication is enabled');
  }
  return { enabled, resetBaseUrl };
}
