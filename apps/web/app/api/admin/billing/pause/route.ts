import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { getBillingRuntime } from '@/lib/server/composition';
import { validateAdminBillingOccurredAtRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const body = unwrapValidation(validateAdminBillingOccurredAtRequest(await parseJsonBody(request)));
  const subscription = await getBillingRuntime().pauseSubscription('user', body.subjectId, body.occurredAt);
  return jsonSuccess({ subscription });
});
