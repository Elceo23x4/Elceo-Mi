import { jsonSuccess, parseJsonBody, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getBillingPolicyRuntime } from '@/lib/server/composition';
import { validateInternalBillingPolicyEvaluateRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;

  const body = unwrapValidation(validateInternalBillingPolicyEvaluateRequest(await parseJsonBody(request)));
  const evaluation = await getBillingPolicyRuntime().evaluateBillingPolicyForSubject('user', body.subjectId, body.sourceReconciliationRunId);
  return jsonSuccess({ evaluation });
});
