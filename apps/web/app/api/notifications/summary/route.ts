import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const runtime = getNotificationRuntimes();
  const [managementSummary, feedbackSummary] = await Promise.all([
    runtime.management.getNotificationOperationalSummaryForSubject(subject.subjectKind, subject.subjectId),
    runtime.feedback.getNotificationFeedbackSummary()
  ]);
  return jsonSuccess({ managementSummary, feedbackSummary, inboxUnreadCount: managementSummary.inboxUnreadCount });
});
