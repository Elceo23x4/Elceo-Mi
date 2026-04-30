import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { validateAccountAccessCheckRequest } from '@elceo/schemas';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getEntitlementsRuntime } from '@/lib/server/composition';

export const POST = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const body = unwrapValidation(validateAccountAccessCheckRequest(await parseJsonBody(request)));
  const decision = await getEntitlementsRuntime().decideFeatureAccess(subject.subjectKind, subject.subjectId, body.feature);
  return jsonSuccess({ decision });
});
