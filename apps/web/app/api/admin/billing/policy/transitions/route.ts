import { jsonSuccess, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getBillingPolicyRuntime } from '@/lib/server/composition';
import { parseAdminBillingPolicyTransitionsQuery } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const { subjectId, limit } = unwrapValidation(parseAdminBillingPolicyTransitionsQuery(new URL(request.url)));
  const transitions = await getBillingPolicyRuntime().listRecentBillingPolicyTransitions('user', subjectId, limit);
  return jsonSuccess({ transitions });
});
