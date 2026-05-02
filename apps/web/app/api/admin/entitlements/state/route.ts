import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { validateAdminEntitlementStateRequest } from '@elceo/schemas';
import { getEntitlementsRuntime } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, getSecurityActorFromRequest, requireSecurityDecision } from '@/lib/server/security';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const body = unwrapValidation(validateAdminEntitlementStateRequest(await parseJsonBody(request)));
  const actor = getSecurityActorFromRequest(request, 'admin');
  const security = await requireSecurityDecision({ request, routePath: '/api/admin/entitlements/state', method: 'POST', actionKind: 'admin_write', actor, subjectId: body.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  try {
    const accountState = await getEntitlementsRuntime().updateAccountState('user', body.subjectId, body.accountState);
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { accountState } });
    await auditInternalMutation({ actor, subjectId: body.subjectId, actionKind: 'admin_write', routePath: '/api/admin/entitlements/state', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ accountState });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
