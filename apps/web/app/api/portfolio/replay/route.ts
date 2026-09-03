import { parseSearchParams, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const params = parseSearchParams(request.url);
  const entityKind = params.get('entityKind');
  const entityId = params.get('entityId');
  if (!entityKind || !entityId) throw new Error('bad_request:entityKind_and_entityId_required');
  const replay = await getApplicationStateRuntime().portfolio.getPortfolioEntityReplay('user', subject.subjectId, entityKind as 'watchlist_entry' | 'position' | 'action_item', entityId);
  if (!replay) throw new Error('not_found');
  return jsonSuccess({ replay });
});
