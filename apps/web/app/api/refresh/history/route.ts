import { parsePositiveInt, parseSearchParams, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getRefreshRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const limit = parsePositiveInt(parseSearchParams(request.url).get('limit'), 50, 200);
  const runs = await getRefreshRuntime().listSnapshotRefreshRuns(subject.subjectKind, subject.subjectId, limit);
  return jsonSuccess({ runs });
});
