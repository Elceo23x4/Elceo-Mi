import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getTenantNotificationRuntimes } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const runtime = getTenantNotificationRuntimes(subject);
  const [degradedTargets, criticalReceipts] = await Promise.all([
    runtime.feedback.listTargetsWithDegradedHealth(50),
    runtime.feedback.listRecentCriticalReceipts(50)
  ]);
  return jsonSuccess({ degradedTargets, criticalReceipts });
});
