import { jsonSuccess, parseJsonBody, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, getSecurityActorFromRequest, requireSecurityDecision } from '@/lib/server/security';
import { getBillingOrchestrationRuntime } from '@/lib/server/composition';
import { validateInternalBillingOrchestrationRetryRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;
  const body = unwrapValidation(validateInternalBillingOrchestrationRetryRequest(await parseJsonBody(request)));
  const actor = getSecurityActorFromRequest(request, 'internal');
  const security = await requireSecurityDecision({ request, routePath: '/api/internal/billing/orchestration/retry', method: 'POST', actionKind: 'billing_orchestration_retry', actor, subjectId: body.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  try { const run = await getBillingOrchestrationRuntime().runRetryForSubject('user', body.subjectId);
    const envelope = { ok: true as const, data: { run } };
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { run }, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, subjectId: body.subjectId, actionKind: 'billing_orchestration_retry', routePath: '/api/internal/billing/orchestration/retry', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ run });
  } catch (error) { await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' }); throw error; }
});