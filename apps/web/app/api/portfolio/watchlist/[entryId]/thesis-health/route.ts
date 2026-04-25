import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { validateWatchlistThesisHealthRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ entryId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const body = unwrapValidation(validateWatchlistThesisHealthRequest(await parseJsonBody(request)));
  const { entryId } = await context.params;
  const entry = await getApplicationStateRuntime().portfolio.changeWatchlistThesisHealth(entryId, body.thesisHealth, { actorKind: 'user', actorId: subject.userId });
  return jsonSuccess({ entry });
});
