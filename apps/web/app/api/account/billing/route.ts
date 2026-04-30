import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getBillingRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const runtime = getBillingRuntime();
  const subscription = await runtime.getLatestBillingSubscription(subject.subjectKind, subject.subjectId);
  const commercialState = await runtime.getBillingCommercialState(subject.subjectKind, subject.subjectId);
  return jsonSuccess({ subscription, commercialState });
});
