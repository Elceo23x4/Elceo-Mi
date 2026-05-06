import { jsonSuccess, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { requireFeatureAccess } from '@/lib/server/access';
import { getMarketIntelligenceRuntime } from '@/lib/server/composition';
import { parseMarketEvidencePayloadQuery } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (request: Request) => { requireInternalRouteAccess(request); const access = await requireFeatureAccess('admin.read', { request }); if (!access.ok) return access.response; const query = unwrapValidation(parseMarketEvidencePayloadQuery(new URL(request.url))); const rt = getMarketIntelligenceRuntime(); let payloads = query.asset ? await rt.listEvidencePayloadsByAsset(query.asset, query.limit ?? undefined) : query.evidenceClass ? await rt.listEvidencePayloadsByEvidenceClass(query.evidenceClass, query.limit ?? undefined) : query.evidenceTypeId ? await rt.listEvidencePayloadsByEvidenceType(query.evidenceTypeId, query.limit ?? undefined) : []; if (query.providerId) payloads = payloads.filter((x) => x.providerId === query.providerId); if (query.region) payloads = payloads.filter((x) => x.region === query.region); return jsonSuccess({ payloads, selectionMode: query.asset ? 'asset' : query.evidenceClass ? 'evidenceClass' : query.evidenceTypeId ? 'evidenceTypeId' : 'all' }); });
