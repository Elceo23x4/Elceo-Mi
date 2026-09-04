import type { TargetCreateRequest } from '@elceo/types';
import type { NotificationTargetKind } from '@elceo/types';

export type PublicTargetAddress = { targetKind: NotificationTargetKind; addressJson: string };

export function buildPublicTargetAddress(request: TargetCreateRequest, subjectId: string): PublicTargetAddress {
  if (request.channel === 'in_app') {
    return { targetKind: 'in_app_user', addressJson: JSON.stringify({ subjectId }) };
  }
  if (request.channel === 'email') {
    const email = request.email.trim().toLowerCase();
    if (!email) throw new Error('bad_request:email_required');
    return { targetKind: 'email_address', addressJson: JSON.stringify({ email }) };
  }
  if (request.channel === 'push') {
    const subscriptionId = request.subscriptionId.trim().toLowerCase();
    if (!subscriptionId) throw new Error('bad_request:push_subscription_required');
    return { targetKind: 'push_endpoint', addressJson: JSON.stringify({ subscriptionId }) };
  }
  throw new Error('bad_request:unsupported_notification_target_channel');
}
