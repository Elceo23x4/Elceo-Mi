import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getRefreshRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const latestRun = await getRefreshRuntime().getLatestSnapshotRefreshRun(subject.subjectKind, subject.subjectId);
  return jsonSuccess({ latestRun });
});
