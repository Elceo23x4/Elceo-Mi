import type { NotificationChannel, NotificationTargetKind } from '@elceo/types';

export type PublicTargetAddress = { targetKind: NotificationTargetKind; addressJson: string };

export function buildPublicTargetAddress(channel: NotificationChannel, value: string | undefined, subjectId: string): PublicTargetAddress {
  if (channel === 'in_app') {
    return { targetKind: 'in_app_user', addressJson: JSON.stringify({ userId: subjectId }) };
  }
  if (channel === 'email') {
    const email = (value ?? '').trim().toLowerCase();
    if (!email) throw new Error('bad_request:email_required');
    return { targetKind: 'email_address', addressJson: JSON.stringify({ email }) };
  }
  if (channel === 'push') {
    const endpoint = (value ?? '').trim();
    if (!endpoint) throw new Error('bad_request:push_endpoint_required');
    return { targetKind: 'push_endpoint', addressJson: JSON.stringify({ endpoint }) };
  }
  throw new Error('bad_request:unsupported_notification_target_channel');
}
