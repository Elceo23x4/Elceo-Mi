import { jsonSuccess, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireInternalRouteAccess } from '@/lib/server/auth';
import { requireFeatureAccess } from '@/lib/server/access';
import { getPaymentProviderRuntime } from '@/lib/server/composition';
import { parseAdminBillingProviderEventsQuery } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (request: Request) => {
  requireInternalRouteAccess(request);
  const access = await requireFeatureAccess('admin.read', { request });
  if (!access.ok) return access.response;
  const parsed = parseAdminBillingProviderEventsQuery(new URL(request.url));
  if (!parsed.ok) throw new Error(`validation_error:${(parsed as { ok: false; errors: string[] }).errors.join('|')}`);
  const query = unwrapValidation(parsed);
  if (query.subjectId) {
    const events = await getPaymentProviderRuntime().listExternalEventsForSubject('user', query.subjectId, query.limit);
    return jsonSuccess({ mode: 'subject', events });
  }
  const events = await getPaymentProviderRuntime().listUnprocessedExternalEvents(query.limit);
  return jsonSuccess({ mode: 'unprocessed', events });
});
