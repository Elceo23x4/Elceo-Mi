import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getBillingRuntime } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, getSecurityActorFromRequest, requireSecurityDecision } from '@/lib/server/security';
import { validateAdminBillingRenewRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const body = unwrapValidation(validateAdminBillingRenewRequest(await parseJsonBody(request)));
  const actor = getSecurityActorFromRequest(request, 'admin');
  const security = await requireSecurityDecision({ request, routePath: '/api/admin/billing/renew', method: 'POST', actionKind: 'admin_write', actor, subjectId: body.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  try {
    const subscription = await getBillingRuntime().renewPaidPlan('user', body.subjectId, body.nextPeriodStart, body.nextPeriodEnd);
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { subscription } });
    await auditInternalMutation({ actor, subjectId: body.subjectId, actionKind: 'admin_write', routePath: '/api/admin/billing/renew', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ subscription });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
