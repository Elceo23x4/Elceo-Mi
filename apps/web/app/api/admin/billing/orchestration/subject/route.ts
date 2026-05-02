import { jsonSuccess, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireFeatureAccess } from '@/lib/server/access';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getBillingOrchestrationRuntime } from '@/lib/server/composition';
import { parseAdminBillingOrchestrationSubjectQuery } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;
  const { subjectId } = unwrapValidation(parseAdminBillingOrchestrationSubjectQuery(new URL(request.url)));
  const snapshot = await getBillingOrchestrationRuntime().getBillingOrchestrationSubjectSnapshot('user', subjectId);
  return jsonSuccess({ snapshot });
});
