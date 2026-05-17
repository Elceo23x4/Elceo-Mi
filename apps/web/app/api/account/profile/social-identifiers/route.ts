import { jsonSuccess, parseJsonBody, unwrapValidation, withApiErrorBoundary } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { assertRouteSubjectOwnership, buildOwnerAccessDeniedResponse, guardRoutePaymentReadiness } from '@/lib/server/access';
import { getUserSocialIdentifiers, setUserSocialIdentifiers } from '../../../../../lib/server/profile/social-identifiers-store';
import { validateUpdateUserSocialIdentifiersRequest } from '@elceo/schemas';
import type { CommercialProfileSocialIdentifier } from '@elceo/types';

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
  const identifiers = getUserSocialIdentifiers(subject.subjectId);
  const paymentReadiness = guardRoutePaymentReadiness(identifiers);
  return jsonSuccess({ userId: subject.subjectId, socialIdentifiers: paymentReadiness.normalizedIdentifiers, paymentReadiness });
});

export const PATCH = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const body = unwrapValidation(validateUpdateUserSocialIdentifiersRequest(await parseJsonBody(request)));
  if (!assertRouteSubjectOwnership({ authenticatedSubjectId: subject.subjectId, routeSubjectId: subject.subjectId })) return buildOwnerAccessDeniedResponse();
  const identifiers = setUserSocialIdentifiers(subject.subjectId, toIdentifierSet(body));
  const paymentReadiness = guardRoutePaymentReadiness(identifiers);
  return jsonSuccess({ userId: subject.subjectId, socialIdentifiers: paymentReadiness.normalizedIdentifiers, paymentReadiness });
});
