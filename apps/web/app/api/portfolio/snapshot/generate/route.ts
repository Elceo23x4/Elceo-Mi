import { withApiErrorBoundary, jsonSuccess } from '@/lib/server/api';
import { getApplicationStateRuntime } from '@/lib/server/composition';
import { maybeIncrementUsage, requireFeatureAccess } from '@/lib/server/access';
import { auditInternalMutation, completeSecurityDecision, failSecurityDecision, requireSecurityDecision } from '@/lib/server/security';

export const POST = withApiErrorBoundary(async (request: Request) => {
  const access = await requireFeatureAccess('portfolio.snapshot.generate', { request });
  if (!access.ok) return access.response;
  const actor = { actorKind: 'user' as const, actorId: access.subject.subjectId, subjectId: access.subject.subjectId };
  const security = await requireSecurityDecision({ request, routePath: '/api/portfolio/snapshot/generate', method: 'POST', actionKind: 'portfolio_snapshot_generate', actor, subjectId: access.subject.subjectId, requestBody: {} });
  if (!security.ok) return security.response;
  try {
    const snapshot = await getApplicationStateRuntime().portfolio.generatePortfolioSnapshot(access.subject.subjectKind, access.subject.subjectId);
    await maybeIncrementUsage('portfolio.snapshot.generate', { request });
    const envelope = { ok: true as const, data: { snapshot } };

    await completeSecurityDecision({ decision: security.decision, idempotencyKey: security.idempotencyKey, responseBody: { snapshot }, responseEnvelope: envelope, httpStatus: 200, requestHash: security.requestHash });
    await auditInternalMutation({ actor, subjectId: access.subject.subjectId, actionKind: 'portfolio_snapshot_generate', routePath: '/api/portfolio/snapshot/generate', method: 'POST', request, idempotencyKey: security.idempotencyKey });
    return jsonSuccess({ snapshot });
  } catch (error) {
    await failSecurityDecision({ idempotencyKey: security.idempotencyKey, errorMessage: error instanceof Error ? error.message : 'unknown_error' });
    throw error;
  }
});
