import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { validateWatchlistStatusRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ entryId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const body = unwrapValidation(validateWatchlistStatusRequest(await parseJsonBody(request)));
  const { entryId } = await context.params;
  const entry = await getApplicationStateRuntime().portfolio.changeWatchlistStatus(entryId, body.status, { actorKind: 'user', actorId: subject.userId });
  return jsonSuccess({ entry });
});
