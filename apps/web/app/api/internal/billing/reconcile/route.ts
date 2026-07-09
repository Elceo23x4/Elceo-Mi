import { jsonSuccess, parseJsonBody, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, getSecurityActorFromRequest, requireSecurityDecision } from '@/lib/server/security';
import { validateInternalBillingReconcileRequest } from '@elceo/schemas';
import { internalPaymentRuntime } from '@elceo/application-state';
import { getBillingLifecycleRuntime } from '@/lib/server/composition';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;
  const body = unwrapValidation(validateInternalBillingReconcileRequest(await parseJsonBody(request)));
  const actor = getSecurityActorFromRequest(request, 'internal');
  const security = await requireSecurityDecision({ request, routePath: '/api/internal/billing/reconcile', method: 'POST', actionKind: 'billing_reconcile', actor, subjectId: body.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  try {
    const payment = body.sourceEventId.startsWith('ipo_') ? await internalPaymentRuntime.reconcile({ operationId: body.sourceEventId, businessIdempotencyKey: body.sourceEventId, subjectUserId: body.subjectId }) : { status: 'not_found' as const };
    const legacyRun = payment.status === 'not_found' ? await getBillingLifecycleRuntime().reconcileProviderEvent(body.providerKind, body.sourceEventId, body.subjectId) : null;
    const envelope = { ok: true as const, data: legacyRun ? { run: legacyRun } : { payment, unknownOrReconciliationRequired: internalPaymentRuntime.listUnknown(), invariant: 'no_provider_charge_created_by_reconciliation' } };
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: envelope.data, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, subjectId: body.subjectId, actionKind: 'billing_reconcile', routePath: '/api/internal/billing/reconcile', method: 'POST', request, idempotencyKey: security.idempotencyKey, metadata: { rc: 'RC-I1', localPaymentCorrectnessOnly: true } });
    return jsonSuccess(envelope.data);
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
