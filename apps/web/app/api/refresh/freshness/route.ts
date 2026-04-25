import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getRefreshRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const [freshness, summary] = await Promise.all([
    getRefreshRuntime().listSnapshotFreshnessForSubject(subject.subjectKind, subject.subjectId),
    getRefreshRuntime().getRefreshAttentionSummary(subject.subjectKind, subject.subjectId)
  ]);
  return jsonSuccess({ freshness, summary });
});
