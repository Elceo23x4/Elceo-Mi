import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';
import { validateVerificationIssueRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  await requireAuthenticatedSubject();
  const body = unwrapValidation(validateVerificationIssueRequest(await parseJsonBody(request)));
  const verification = await getNotificationRuntimes().verification.issueTargetVerification(body.targetId);
  return jsonSuccess({ verification });
});
