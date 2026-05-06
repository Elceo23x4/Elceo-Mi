import { jsonSuccess, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getMarketIntelligenceRuntime } from '@/lib/server/composition';
import { parseScheduledIngestionRunQuery } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (request: Request) => { requireInternalRouteAccess(request); const access = await requireFeatureAccess('admin.read', { request }); if (!access.ok) return access.response; const q = unwrapValidation(parseScheduledIngestionRunQuery(new URL(request.url))); const rt = getMarketIntelligenceRuntime(); if (q.runId) return jsonSuccess({ mode: 'runId', run: await rt.getScheduledIngestionRunById(q.runId) }); if (q.providerId) return jsonSuccess({ mode: 'provider', runs: await rt.listScheduledIngestionRunsByProvider(q.providerId, q.capability ?? undefined, q.limit ?? undefined) }); if (q.status) return jsonSuccess({ mode: 'status', runs: await rt.listScheduledIngestionRunsByStatus(q.status, q.limit ?? undefined) }); throw new Error('validation_error:runId or providerId or status is required'); });
