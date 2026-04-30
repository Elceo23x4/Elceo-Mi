import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { requireFeatureAccess } from '@/lib/server/access';

export const GET = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.read', { request });
  if (!access.ok) return access.response;
  const admin = getApplicationStateRuntime().admin;
  
  
  
  
  const { searchParams } = new URL(request.url); const raw = Number(searchParams.get('limit') ?? '100'); const limit = Number.isFinite(raw) ? Math.max(1, Math.min(200, Math.trunc(raw))) : 100; const audit = await admin.getAdminAuditTimeline(limit); return jsonSuccess({ audit });
});
