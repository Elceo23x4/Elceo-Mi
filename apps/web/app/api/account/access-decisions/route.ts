import { parsePositiveInt, parseSearchParams, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getEntitlementsRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const limit = parsePositiveInt(parseSearchParams(request.url).get('limit'), 20, 100);
  const decisions = await getEntitlementsRuntime().listRecentAccessDecisions(subject.subjectKind, subject.subjectId, limit);
  return jsonSuccess({ decisions });
});
