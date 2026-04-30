import { jsonSuccess, parseJsonBody, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { requireFeatureAccess } from '@/lib/server/access';
import { getPaymentProviderRuntime } from '@/lib/server/composition';
import { validateBillingProviderEventReplayRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.ops', { request });
  if (!access.ok) return access.response;
  const body = unwrapValidation(validateBillingProviderEventReplayRequest(await parseJsonBody(request)));
  const results = await getPaymentProviderRuntime().replayUnprocessedEvents(body.limit);
  return jsonSuccess({ results });
});
