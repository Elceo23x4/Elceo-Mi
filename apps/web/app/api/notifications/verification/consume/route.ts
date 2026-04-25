import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';
import { validateVerificationConsumeRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request) => {
  await requireAuthenticatedSubject();
  const body = unwrapValidation(validateVerificationConsumeRequest(await parseJsonBody(request)));
  const result = await getNotificationRuntimes().verification.consumeTargetVerification(body.targetId, body.token);
  return jsonSuccess({ result });
});
