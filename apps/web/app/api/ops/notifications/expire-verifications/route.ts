import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';
import { requireFeatureAccess } from '@/lib/server/access';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;
  const report = await getNotificationRuntimes().verification.expireStaleVerifications();
  return jsonSuccess({ report });
});
