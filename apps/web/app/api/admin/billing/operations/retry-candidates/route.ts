import { jsonSuccess, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getBillingAdminRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;
  const raw = Number.parseInt(new URL(request.url).searchParams.get('limit') ?? '', 10);
  const limit = Number.isInteger(raw) && raw > 0 && raw <= 500 ? raw : undefined;
  const candidates = await getBillingAdminRuntime().listBillingRetryCandidates(limit);
  return jsonSuccess({ candidates, limit: limit ?? null });
});
