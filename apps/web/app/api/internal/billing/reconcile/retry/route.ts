import { jsonError, jsonSuccess, parseJsonBody, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getBillingAdminRuntime, getBillingLifecycleRuntime } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, getSecurityActorFromRequest, requireSecurityDecision } from '@/lib/server/security';
import { validateInternalBillingReconcileRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;

  const body = unwrapValidation(validateInternalBillingReconcileRequest(await parseJsonBody(request)));
  const actor = getSecurityActorFromRequest(request, 'internal');
  const security = await requireSecurityDecision({ request, routePath: '/api/internal/billing/reconcile/retry', method: 'POST', actionKind: 'billing_reconcile', actor, subjectId: body.subjectId, requestBody: body });
  if (!security.ok) return security.response;

  let providerKind = body.providerKind;
  let sourceEventId = body.sourceEventId;
  if (!providerKind || !sourceEventId) {
    const candidates = await getBillingAdminRuntime().listBillingRetryCandidates(50);
    const candidate = candidates.find((entry) => entry.subjectId === body.subjectId);
    if (!candidate) return jsonError('unprocessable_entity', 'No retryable reconciliation context exists for subject');
    providerKind ??= candidate.providerKind;
    sourceEventId ??= candidate.latestReconciliationRunId ?? undefined;
  }

  if (!providerKind || !sourceEventId) return jsonError('unprocessable_entity', 'No retryable reconciliation source event exists for subject');

  try {
    const run = await getBillingLifecycleRuntime().reconcileProviderEvent(providerKind, sourceEventId, body.subjectId);
    const envelope = { ok: true as const, data: { run } };
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { run }, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, subjectId: body.subjectId, actionKind: 'billing_reconcile', routePath: '/api/internal/billing/reconcile/retry', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ run });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
