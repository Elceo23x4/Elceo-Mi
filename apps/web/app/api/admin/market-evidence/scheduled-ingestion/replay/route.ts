import { jsonSuccess, parseJsonBody, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getMarketIntelligenceRuntime } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, getSecurityActorFromRequest, requireSecurityDecision } from '@/lib/server/security';
import { parseScheduledIngestionReplayQuery, validateInternalScheduledIngestionReplayRequest } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.read', { request });
  if (!access.ok) return access.response;
  const q = unwrapValidation(parseScheduledIngestionReplayQuery(new URL(request.url)));
  return jsonSuccess({ replay: await getMarketIntelligenceRuntime().getScheduledIngestionRunReplay(q.runId) });
});

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;
  const body = unwrapValidation(validateInternalScheduledIngestionReplayRequest(await parseJsonBody(request)));
  const actor = getSecurityActorFromRequest(request, 'internal');
  const security = await requireSecurityDecision({ request, routePath: '/api/admin/market-evidence/scheduled-ingestion/replay', method: 'POST', actionKind: 'internal_mutation', actor, subjectId: access.subject.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  try {
    const report = await getMarketIntelligenceRuntime().replayScheduledIngestionRun(body.runId, body.replayMode ?? undefined, body.startedAt ?? undefined);
    const envelope = { ok: true as const, data: { report } };
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { report }, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, subjectId: access.subject.subjectId, actionKind: 'internal_mutation', routePath: '/api/admin/market-evidence/scheduled-ingestion/replay', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess(envelope.data);
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
