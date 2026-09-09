import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getTenantNotificationRuntimes } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const runtime = getTenantNotificationRuntimes(subject);
  const [degradedTargets, criticalReceipts] = await Promise.all([
    runtime.feedback.listTargetsWithDegradedHealthForSubject(subject.subjectKind, subject.subjectId, 50),
    runtime.feedback.listRecentCriticalReceiptsForSubject(subject.subjectKind, subject.subjectId, 50)
  ]);
  return jsonSuccess({ degradedTargets, criticalReceipts });
});
