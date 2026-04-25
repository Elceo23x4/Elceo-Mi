import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';

export const POST = withApiErrorBoundary(async (_request: Request, context: { params: Promise<{ entryId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { entryId } = await context.params;
  const entry = await getApplicationStateRuntime().portfolio.archiveWatchlistEntry(entryId, { actorKind: 'user', actorId: subject.userId });
  return jsonSuccess({ entry });
});
