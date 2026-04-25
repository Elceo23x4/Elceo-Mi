import { parsePositiveInt, parseSearchParams, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getWorkspaceRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const limit = parsePositiveInt(parseSearchParams(request.url).get('limit'), 25, 100);
  const snapshots = await getWorkspaceRuntime().listWorkspaceSnapshots(subject.subjectKind, subject.subjectId, limit);
  return jsonSuccess({ snapshots, limit });
});
