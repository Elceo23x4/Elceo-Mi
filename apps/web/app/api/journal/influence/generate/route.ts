import { parseSearchParams, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';

export const POST = withApiErrorBoundary(async (request: Request) => {
  const subject = await requireAuthenticatedSubject();
  const params = parseSearchParams(request.url);
  const assetScope = (params.get('assetScope') ?? '*') as '*' | string;
  const timeframeScope = (params.get('timeframeScope') ?? '*') as '*' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1';
  const requestBody = { assetScope, timeframeScope };
  const actor = { actorKind: 'user' as const, actorId: subject.subjectId, subjectId: subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/journal/influence/generate', method: 'POST', actionKind: 'journal_influence_generate', actor, subjectId: subject.subjectId, requestBody });
  if (!security.ok) return security.response;
  try {
    const snapshot = await getApplicationStateRuntime().journalInfluence.generateJournalInfluenceSnapshot({ subjectKind: subject.subjectKind, subjectId: subject.subjectId, assetScope, timeframeScope });
    const envelope = { ok: true as const, data: { snapshot } };

    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { snapshot }, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, subjectId: subject.subjectId, actionKind: 'journal_influence_generate', routePath: '/api/journal/influence/generate', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ snapshot });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
