import { jsonSuccess, parseJsonBody, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getBillingLifecycleRuntime } from '@/lib/server/composition';
import { validateInternalBillingReconcileRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;

  const body = unwrapValidation(validateInternalBillingReconcileRequest(await parseJsonBody(request)));
  const run = await getBillingLifecycleRuntime().reconcileProviderEvent(body.providerKind, body.sourceEventId, body.subjectId);
  return jsonSuccess({ run });
});
