import { jsonSuccess, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getMarketIntelligenceRuntime } from '@/lib/server/composition';
import { parseScheduledIngestionReplayQuery } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (request: Request) => { requireInternalRouteAccess(request); const access = await requireFeatureAccess('admin.read', { request }); if (!access.ok) return access.response; const q = unwrapValidation(parseScheduledIngestionReplayQuery(new URL(request.url))); return jsonSuccess({ replay: await getMarketIntelligenceRuntime().getScheduledIngestionRunReplay(q.runId) }); });
