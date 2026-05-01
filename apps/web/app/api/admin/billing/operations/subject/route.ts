import { jsonSuccess, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getBillingAdminRuntime } from '@/lib/server/composition';
import { parseAdminBillingPolicySubjectQuery } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;
  const { subjectId } = unwrapValidation(parseAdminBillingPolicySubjectQuery(new URL(request.url)));
  const snapshot = await getBillingAdminRuntime().getBillingAdminSubjectSnapshot('user', subjectId);
  return jsonSuccess({ snapshot });
});
