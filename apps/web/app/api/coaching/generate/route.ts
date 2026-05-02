import { parseSearchParams, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { getAnalyticsRuntime } from '@/lib/server/composition';
import { maybeIncrementUsage, requireFeatureAccess } from '@/lib/server/access';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';

export const POST = withApiErrorBoundary(async (request: Request) => {
  const access = await requireFeatureAccess('coaching.generate', { request });
  if (!access.ok) return access.response;
  const params = parseSearchParams(request.url);
  const requestBody = {
    assetScope: (params.get('assetScope') ?? '*') as '*' | string,
    timeframeScope: (params.get('timeframeScope') ?? '*') as '*' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1'
  };
  const actor = { actorKind: 'user' as const, actorId: access.subject.subjectId, subjectId: access.subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/coaching/generate', method: 'POST', actionKind: 'coaching_generate', actor, subjectId: access.subject.subjectId, requestBody });
  if (!security.ok) return security.response;
  try {
    const snapshot = await getAnalyticsRuntime().coaching.generateCoachingSnapshot({ subjectKind: access.subject.subjectKind, subjectId: access.subject.subjectId, ...requestBody });
    await maybeIncrementUsage('coaching.generate', { request });
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { snapshot } });
    await auditInternalMutation({ actor, subjectId: access.subject.subjectId, actionKind: 'coaching_generate', routePath: '/api/coaching/generate', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ snapshot });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
