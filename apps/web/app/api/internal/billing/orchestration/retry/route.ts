import { jsonSuccess, parseJsonBody, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getBillingOrchestrationRuntime } from '@/lib/server/composition';
import { validateInternalBillingOrchestrationRetryRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;

  const body = unwrapValidation(validateInternalBillingOrchestrationRetryRequest(await parseJsonBody(request)));
  const run = await getBillingOrchestrationRuntime().runRetryForSubject('user', body.subjectId);
  return jsonSuccess({ run });
});
