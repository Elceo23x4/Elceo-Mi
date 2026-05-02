import { jsonSuccess, parseJsonBody, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getPaymentProviderRuntime } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, getSecurityActorFromRequest, requireSecurityDecision } from '@/lib/server/security';
import { validateBillingProviderEventIngestRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const body = unwrapValidation(validateBillingProviderEventIngestRequest(await parseJsonBody(request)));
  const actor = getSecurityActorFromRequest(request, 'internal');
  const security = await requireSecurityDecision({ request, routePath: '/api/internal/billing/provider-events', method: 'POST', actionKind: 'internal_mutation', actor, requestBody: body });
  if (!security.ok) return security.response;
  try {
    const result = await getPaymentProviderRuntime().ingestExternalEvent(body);
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { result } });
    await auditInternalMutation({ actor, actionKind: 'internal_mutation', routePath: '/api/internal/billing/provider-events', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ result });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
