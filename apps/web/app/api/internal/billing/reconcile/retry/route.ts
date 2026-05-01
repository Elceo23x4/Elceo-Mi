import { jsonError, jsonSuccess, parseJsonBody, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getBillingAdminRuntime, getBillingLifecycleRuntime } from '@/lib/server/composition';
import { validateInternalBillingReconcileRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;

  const body = unwrapValidation(validateInternalBillingReconcileRequest(await parseJsonBody(request)));
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
  const run = await getBillingLifecycleRuntime().reconcileProviderEvent(providerKind, sourceEventId, body.subjectId);
  return jsonSuccess({ run });
});
