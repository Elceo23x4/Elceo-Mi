import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getBillingRuntime } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const events = await getBillingRuntime().listBillingEventsForSubject(subject.subjectKind, subject.subjectId);
  return jsonSuccess({ events });
});
