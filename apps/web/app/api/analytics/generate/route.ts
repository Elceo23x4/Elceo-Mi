import { parseSearchParams, withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { getAnalyticsRuntime } from '@/lib/server/composition';
import { maybeIncrementUsage, requireFeatureAccess } from '@/lib/server/access';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';

export const POST = withApiErrorBoundary(async (request: Request) => {
  const access = await requireFeatureAccess('analytics.generate', { request });
  if (!access.ok) return access.response;
  const params = parseSearchParams(request.url);
  const requestBody = {
    assetScope: (params.get('assetScope') ?? '*') as '*' | string,
    timeframeScope: (params.get('timeframeScope') ?? '*') as '*' | 'M5' | 'M15' | 'H1' | 'H4' | 'D1',
    lookbackDays: Number.parseInt(params.get('lookbackDays') ?? '180', 10)
  };
  const actor = { actorKind: 'user' as const, actorId: access.subject.subjectId, subjectId: access.subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/analytics/generate', method: 'POST', actionKind: 'analytics_generate', actor, subjectId: access.subject.subjectId, requestBody });
  if (!security.ok) return security.response;
  try {
    const snapshot = await getAnalyticsRuntime().analytics.generateAnalyticsSnapshot({ subjectKind: access.subject.subjectKind, subjectId: access.subject.subjectId, ...requestBody });
    await maybeIncrementUsage('analytics.generate', { request });
    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { snapshot } });
    await auditInternalMutation({ actor, subjectId: access.subject.subjectId, actionKind: 'analytics_generate', routePath: '/api/analytics/generate', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ snapshot });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
