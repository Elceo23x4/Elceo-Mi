import { jsonSuccess, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getBillingPolicyRuntime } from '@/lib/server/composition';
import { parseAdminBillingPolicySubjectQuery } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const { subjectId } = unwrapValidation(parseAdminBillingPolicySubjectQuery(new URL(request.url)));
  const snapshot = await getBillingPolicyRuntime().getBillingPolicySnapshot('user', subjectId);
  return jsonSuccess({ snapshot });
});
