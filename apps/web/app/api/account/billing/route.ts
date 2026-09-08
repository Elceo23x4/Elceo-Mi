import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getBillingLifecycleRuntime } from '@/lib/server/composition';
import { toAccountBillingSnapshotDto } from '@/lib/server/account/billing-dto';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const snapshot = await getBillingLifecycleRuntime().getBillingLifecycleSnapshot(subject.subjectKind, subject.subjectId);
  return jsonSuccess({ snapshot: toAccountBillingSnapshotDto(snapshot) });
});
