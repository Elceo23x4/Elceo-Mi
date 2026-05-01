import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getBillingLifecycleRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const runs = await getBillingLifecycleRuntime().listRecentBillingReconciliationRuns(subject.subjectKind, subject.subjectId, 20);
  return jsonSuccess({ runs });
});
