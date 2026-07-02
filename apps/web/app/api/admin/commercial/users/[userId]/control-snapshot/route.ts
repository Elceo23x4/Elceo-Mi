import { jsonSuccess, withApiErrorBoundary } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { requireFeatureAccess } from '@/lib/server/access';
import { getSuperAdminCommercialControlSnapshot } from '@elceo/application-state';
const commercialUnavailableEnvelope = { ok: false as const, error: { code: 'service_unavailable', message: 'Commercial persistence unavailable', details: ['commercial_persistence_unavailable'] } };
export const GET = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ userId: string }> }) => { requireInternalRouteAccess(request); const access = await requireFeatureAccess('admin.read', { request }); if (!access.ok) return access.response; const { userId } = await context.params; try { return jsonSuccess({ targetUserId: userId, snapshot: await getSuperAdminCommercialControlSnapshot(userId) }); } catch (error) { if (error && typeof error === 'object' && (error as { code?: unknown }).code === 'commercial_persistence_unavailable') return Response.json(commercialUnavailableEnvelope, { status: 503 }); throw error; } });
