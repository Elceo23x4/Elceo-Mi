import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getBillingPolicyRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const snapshot = await getBillingPolicyRuntime().getBillingPolicySnapshot(subject.subjectKind, subject.subjectId);
  return jsonSuccess({ snapshot });
});
