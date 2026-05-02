import { parseJsonBody, unwrapValidation, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';
import { validateJournalCancelRequest } from '@elceo/schemas';

export const POST = withApiErrorBoundary(async (request: Request, context: { params: Promise<{ caseId: string }> }) => {
  const subject = await requireAuthenticatedSubject();
  const { caseId } = await context.params;
  const patch = unwrapValidation(validateJournalCancelRequest(await parseJsonBody(request)));
  const actor = { actorKind: 'user' as const, actorId: subject.userId, subjectId: subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/journal/cases/[caseId]/cancel', method: 'POST', actionKind: 'journal_case_lifecycle', actor, subjectId: subject.subjectId, requestBody: patch });
  if (!security.ok) return security.response;
  try {
  const updated = await getApplicationStateRuntime().journal.cancelCase(caseId, patch as never, { actorKind: 'user', actorId: subject.userId });
  if (updated.identity.subjectId !== subject.subjectId) throw new Error('forbidden');
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { case: updated } });
    await auditInternalMutation({ actor, subjectId: subject.subjectId, actionKind: 'journal_case_lifecycle', routePath: '/api/journal/cases/[caseId]/cancel', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ case: updated });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
