import { jsonSuccess, parseJsonBody, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { assertRouteSubjectOwnership, buildOwnerAccessDeniedResponse } from '@/lib/server/access';
import { getUserSocialIdentifiers, setUserSocialIdentifiers } from '../../../../../lib/server/profile/social-identifiers-store';
import { validateUpdateUserSocialIdentifiersRequest } from '@elceo/schemas';
import type { CommercialProfileSocialIdentifier } from '@elceo/types';
import { isCommercialPersistenceError } from '@elceo/application-state';

function toIdentifierSet(input: { linkedinAddress?: string; telegramId?: string; xUsername?: string }): CommercialProfileSocialIdentifier[] {
  const identifiers: CommercialProfileSocialIdentifier[] = [];
  if (input.linkedinAddress) identifiers.push({ kind: 'linkedin_address', value: input.linkedinAddress });
  if (input.telegramId) identifiers.push({ kind: 'telegram_id', value: input.telegramId });
  if (input.xUsername) identifiers.push({ kind: 'x_username', value: input.xUsername });
  return identifiers;
}

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  if (!assertRouteSubjectOwnership({ authenticatedSubjectId: subject.subjectId, routeSubjectId: subject.subjectId })) return buildOwnerAccessDeniedResponse();
  try { const snapshot = await getUserSocialIdentifiers(subject.subjectId); return jsonSuccess(snapshot); } catch (error) { if (isCommercialPersistenceError(error)) return Response.json({ ok: false, error: { code: 'service_unavailable', message: 'Commercial persistence unavailable', details: ['commercial_persistence_unavailable'] } }, { status: 503 }); throw error; }
});

export const PATCH = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const body = unwrapValidation(validateUpdateUserSocialIdentifiersRequest(await parseJsonBody(request)));
  if (!assertRouteSubjectOwnership({ authenticatedSubjectId: subject.subjectId, routeSubjectId: subject.subjectId })) return buildOwnerAccessDeniedResponse();
  try { const snapshot = await setUserSocialIdentifiers(subject.subjectId, toIdentifierSet(body)); return jsonSuccess(snapshot); } catch (error) { if (isCommercialPersistenceError(error)) return Response.json({ ok: false, error: { code: 'service_unavailable', message: 'Commercial persistence unavailable', details: ['commercial_persistence_unavailable'] } }, { status: 503 }); throw error; }
});
