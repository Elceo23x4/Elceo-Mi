export type NotificationProviderMode = 'disabled' | 'local_fake_provider' | 'replay_provider' | 'sandbox_provider' | 'production_provider_blocked';

export function getNotificationProviderMode(env: Record<string, string | undefined>): NotificationProviderMode {
  const raw = (env.NOTIFICATION_PROVIDER_MODE ?? env.ELCEO_NOTIFICATION_PROVIDER_MODE ?? '').trim().toLowerCase();
  if (raw === 'sandbox_provider') return 'sandbox_provider';
  if (raw === 'replay_provider') return 'replay_provider';
  if (raw === 'production_provider' || raw === 'production_provider_blocked') return 'production_provider_blocked';
  if (raw === 'disabled') return 'disabled';
  return 'local_fake_provider';
}

export function assertNotificationProviderModeAllowed(env: Record<string, string | undefined>): void {
  const mode = getNotificationProviderMode(env);
  if (mode === 'production_provider_blocked') throw new Error('production_notification_provider_blocked');
  if (mode === 'sandbox_provider' && env.ELCEO_NOTIFICATION_SANDBOX_SMOKE !== '1') throw new Error('notification_sandbox_requires_explicit_opt_in');
}
