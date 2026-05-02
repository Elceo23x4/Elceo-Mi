import { jsonSuccess, parseJsonBody, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, getSecurityActorFromRequest, requireSecurityDecision } from '@/lib/server/security';
import { getBillingPolicyRuntime } from '@/lib/server/composition';
import { validateInternalBillingPolicyEvaluateRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;
  const body = unwrapValidation(validateInternalBillingPolicyEvaluateRequest(await parseJsonBody(request)));
  const actor = getSecurityActorFromRequest(request, 'internal');
  const security = await requireSecurityDecision({ request, routePath: '/api/internal/billing/policy/evaluate', method: 'POST', actionKind: 'billing_policy_evaluate', actor, subjectId: body.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  try { const evaluation = await getBillingPolicyRuntime().evaluateBillingPolicyForSubject('user', body.subjectId, body.sourceReconciliationRunId);
    const envelope = { ok: true as const, data: { evaluation } };

    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { evaluation }, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, subjectId: body.subjectId, actionKind: 'billing_policy_evaluate', routePath: '/api/internal/billing/policy/evaluate', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ evaluation });
  } catch (error) { await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' }); throw error; }
});