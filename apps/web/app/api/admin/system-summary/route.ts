import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { requireFeatureAccess } from '@/lib/server/access';

export const GET = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.read', { request });
  if (!access.ok) return access.response;
  const admin = getApplicationStateRuntime().admin;
  const summary = await admin.getAdminSystemSummary('ops', 'global'); return jsonSuccess({ summary });
  
  
  
  
});
