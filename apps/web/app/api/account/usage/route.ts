import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getEntitlementsRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const usage = await getEntitlementsRuntime().listUsageCounters(subject.subjectKind, subject.subjectId);
  return jsonSuccess({ usage });
});
