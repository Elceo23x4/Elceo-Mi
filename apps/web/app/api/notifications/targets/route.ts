import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getNotificationRuntimes } from '@/lib/server/composition';
import { validateTargetCreateRequest } from '@elceo/schemas';

const targetKindByChannel = { in_app: 'in_app_user', email: 'email_address', push: 'push_endpoint', sms: 'email_address', webhook: 'email_address' } as const;

export const GET = withApiErrorBoundary(async () => {
  const subject = await requireAuthenticatedSubject();
  const targets = await getNotificationRuntimes().management.listTargetsForSubjectDetailed(subject.subjectKind, subject.subjectId);
  return jsonSuccess({ targets });
});

export const POST = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const body = unwrapValidation(validateTargetCreateRequest(await parseJsonBody(request)));
  const target = await getNotificationRuntimes().management.registerOrUpdateTarget({
    subjectKind: subject.subjectKind,
    subjectId: subject.subjectId,
    channel: body.channel,
    targetKind: targetKindByChannel[body.channel],
    label: body.label ?? null,
    addressJson: JSON.stringify({ value: body.value })
  });
  return jsonSuccess({ target });
});
