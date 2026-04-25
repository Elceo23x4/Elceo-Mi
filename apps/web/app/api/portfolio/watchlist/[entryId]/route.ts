import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { validateWatchlistUpdateRequest } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (_request: Request, context: { params: Promise<{ entryId: string }> }) => {
  await requireAuthenticatedSubject();
  const { entryId } = await context.params;
  const replay = await getApplicationStateRuntime().portfolio.getPortfolioEntityReplay('watchlist_entry', entryId);
  if (!replay) throw new Error('not_found');
  return jsonSuccess({ entry: replay.current, replay });
});

export const PATCH = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ entryId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { entryId } = await context.params;
  const patch = unwrapValidation(validateWatchlistUpdateRequest(await parseJsonBody(request)));
  const entry = await getApplicationStateRuntime().portfolio.updateWatchlistEntry(entryId, patch, { actorKind: 'user', actorId: subject.userId });
  return jsonSuccess({ entry });
});
