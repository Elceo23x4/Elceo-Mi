import { jsonSuccess, parseJsonBody, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { requireFeatureAccess } from '@/lib/server/access';
import { getPaymentProviderRuntime } from '@/lib/server/composition';
import { validateBillingProviderPlanMappingRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;
  const body = unwrapValidation(validateBillingProviderPlanMappingRequest(await parseJsonBody(request)));
  const mapping = await getPaymentProviderRuntime().upsertProviderPlanMapping(body);
  return jsonSuccess({ mapping });
});
