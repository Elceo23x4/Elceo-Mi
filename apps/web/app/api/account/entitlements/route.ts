import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getEntitlementsRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const runtime = getEntitlementsRuntime();
  const accountState = await runtime.getAccountEntitlementState(subject.subjectKind, subject.subjectId);
  const profile = await runtime.getCurrentEntitlementProfile(subject.subjectKind, subject.subjectId);
  return jsonSuccess({ accountState, profile });
});
