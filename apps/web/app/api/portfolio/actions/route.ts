import { parseJsonBody, parsePositiveInt, parseSearchParams, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';
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
  const actor = { actorKind: 'user' as const, actorId: subject.userId, subjectId: subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/portfolio/actions', method: 'POST', actionKind: 'portfolio_action_write', actor, subjectId: subject.subjectId, requestBody: body });
  if (!security.ok) return security.response;
  try {
    const action = await getApplicationStateRuntime().portfolio.createActionItem({ subjectKind: subject.subjectKind, subjectId: subject.subjectId, kind: body.kind, priority: body.priority, asset: body.asset ?? null, timeframe: body.timeframe ?? null, headline: body.headline, rationale: body.rationale, linkedEntryId: body.linkedEntryId ?? null, linkedPositionId: body.linkedPositionId ?? null, linkedJournalCaseId: body.linkedJournalCaseId ?? null, linkedReasoningRunId: body.linkedReasoningRunId ?? null, linkedNotificationDecisionId: body.linkedNotificationDecisionId ?? null }, { actorKind: 'user', actorId: subject.userId });
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { action } });
    await auditInternalMutation({ actor, subjectId: subject.subjectId, actionKind: 'portfolio_action_write', routePath: '/api/portfolio/actions', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ action });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
