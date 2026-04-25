import { parseJsonBody, parsePositiveInt, parseSearchParams, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { validateActionCreateRequest } from '@elceo/schemas';

export const GET = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const params = parseSearchParams(request.url);
  const actions = await getApplicationStateRuntime().portfolio.listOpenActionQueue(subject.subjectKind, subject.subjectId, parsePositiveInt(params.get('limit'), 50, 200));
  return jsonSuccess({ actions });
});

export const POST = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const body = unwrapValidation(validateActionCreateRequest(await parseJsonBody(request)));
  const action = await getApplicationStateRuntime().portfolio.createActionItem({ subjectKind: subject.subjectKind, subjectId: subject.subjectId, kind: body.kind, priority: body.priority, asset: body.asset ?? null, timeframe: body.timeframe ?? null, headline: body.headline, rationale: body.rationale, linkedEntryId: body.linkedEntryId ?? null, linkedPositionId: body.linkedPositionId ?? null, linkedJournalCaseId: body.linkedJournalCaseId ?? null, linkedReasoningRunId: body.linkedReasoningRunId ?? null, linkedNotificationDecisionId: body.linkedNotificationDecisionId ?? null }, { actorKind: 'user', actorId: subject.userId });
  return jsonSuccess({ action });
});
