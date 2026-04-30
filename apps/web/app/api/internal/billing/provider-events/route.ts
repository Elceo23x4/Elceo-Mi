import { jsonSuccess, parseJsonBody, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getPaymentProviderRuntime } from '@/lib/server/composition';
import { validateBillingProviderEventIngestRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const body = unwrapValidation(validateBillingProviderEventIngestRequest(await parseJsonBody(request)));
  const result = await getPaymentProviderRuntime().ingestExternalEvent(body);
  return jsonSuccess({ result });
});
