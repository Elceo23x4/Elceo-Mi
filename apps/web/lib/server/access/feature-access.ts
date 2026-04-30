import 'server-only';

import type { ElceoFeatureKey } from '@elceo/types';
import { jsonError } from '@/lib/server/api';
import { requireAuthenticatedSubject } from '@/lib/server/auth';
import { getApplicationStateRuntime } from '@/lib/server/composition';

export type ServerAccessRequestContext = { request: Request };

const INCREMENTABLE_FEATURES: ReadonlySet<ElceoFeatureKey> = new Set([
  'workspace.refresh',
  'analytics.generate',
  'coaching.generate',
  'portfolio.snapshot.generate',
  'refresh.run'
]);

export async function getFeatureAccessDecision(feature: ElceoFeatureKey, _requestContext: ServerAccessRequestContext) {
  const subject = await requireAuthenticatedSubject();
  const decision = await getApplicationStateRuntime().entitlements.decideFeatureAccess(subject.subjectKind, subject.subjectId, feature);
  return { subject, decision };
}

export async function requireFeatureAccess(feature: ElceoFeatureKey, requestContext: ServerAccessRequestContext) {
  const { subject, decision } = await getFeatureAccessDecision(feature, requestContext);
  if (decision.accessLevel === 'blocked') {
    return {
      ok: false as const,
      response: jsonError('forbidden', 'Feature access blocked', [
        `feature:${feature}`,
        `reason:${decision.reasonCode}`,
        `accessLevel:${decision.accessLevel}`
      ], 403)
    };
  }
  return { ok: true as const, subject, decision };
}

export async function maybeIncrementUsage(feature: ElceoFeatureKey, _requestContext: ServerAccessRequestContext) {
  if (!INCREMENTABLE_FEATURES.has(feature)) return null;
  const subject = await requireAuthenticatedSubject();
  return getApplicationStateRuntime().entitlements.incrementUsageForFeature(subject.subjectKind, subject.subjectId, feature);
}
