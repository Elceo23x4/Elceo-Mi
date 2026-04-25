import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async () => {
  await requireAuthenticatedSubject();
  const runtime = getNotificationRuntimes();
  const [degradedTargets, criticalReceipts] = await Promise.all([
    runtime.feedback.listTargetsWithDegradedHealth(50),
    runtime.feedback.listRecentCriticalReceipts(50)
  ]);
  return jsonSuccess({ degradedTargets, criticalReceipts });
});
