import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getRefreshRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const refresh = getRefreshRuntime();
  const [freshnessRecords, attentionSummary, domainsNeedingRefresh] = await Promise.all([
    refresh.listSnapshotFreshnessForSubject(subject.subjectKind, subject.subjectId),
    refresh.getRefreshAttentionSummary(subject.subjectKind, subject.subjectId),
    refresh.listDomainsNeedingRefresh(subject.subjectKind, subject.subjectId)
  ]);
  return jsonSuccess({ freshnessRecords, attentionSummary, domainsNeedingRefresh });
});
