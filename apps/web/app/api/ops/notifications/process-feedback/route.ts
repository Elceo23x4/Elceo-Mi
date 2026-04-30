import { parseJsonBody, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';
import { requireFeatureAccess } from '@/lib/server/access';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;
  const body = await parseJsonBody(request) as { providerKind?: string; channel?: 'in_app' | 'email' | 'push' | 'sms' | 'webhook'; rawEvent?: unknown };
  if (!body.providerKind || !body.channel) throw new Error('validation_error:providerKind and channel required');
  const report = await getNotificationRuntimes().feedback.processProviderEvent(body.providerKind, body.channel, body.rawEvent ?? {});
  return jsonSuccess({ report });
});
