import { jsonSuccess, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getBillingAdminRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;
  const summary = await getBillingAdminRuntime().getBillingAdminOperationalSummary();
  return jsonSuccess({ summary });
});
