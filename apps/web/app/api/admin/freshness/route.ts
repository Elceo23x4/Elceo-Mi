import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const admin = getApplicationStateRuntime().admin;
  
  const freshness = await admin.getAdminFreshnessSummary('ops', 'global'); return jsonSuccess({ freshness });
  
  
  
});
