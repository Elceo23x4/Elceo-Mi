import { jsonSuccess, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getMarketIntelligenceRuntime } from '@/lib/server/composition';
import { parseScheduledIngestionPolicyQuery } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (request: Request) => { requireInternalRouteAccess(request); const access = await requireFeatureAccess('admin.read', { request }); if (!access.ok) return access.response; const q = unwrapValidation(parseScheduledIngestionPolicyQuery(new URL(request.url))); const snapshot = getMarketIntelligenceRuntime().getScheduledIngestionPolicySnapshot(q.generatedAt ?? undefined); return jsonSuccess({ snapshot: q.providerId ? { ...snapshot, policies: snapshot.policies.filter((x) => x.providerId === q.providerId) } : snapshot }); });
