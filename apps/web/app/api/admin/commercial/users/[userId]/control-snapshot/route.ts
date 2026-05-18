import { jsonSuccess, withApiErrorBoundary } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { requireFeatureAccess } from '@/lib/server/access';
import { getSuperAdminCommercialControlSnapshot } from '@elceo/application-state';
export const GET = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ userId: string }> }) => { requireInternalRouteAccess(request); const access = await requireFeatureAccess('admin.read', { request }); if (!access.ok) return access.response; const { userId } = await context.params; return jsonSuccess({ targetUserId: userId, snapshot: await getSuperAdminCommercialControlSnapshot(userId) }); });
