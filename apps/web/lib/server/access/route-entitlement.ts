import { jsonError } from '@/lib/server/api';
import type { CommercialFeatureKey, CommercialProfileSocialIdentifier, UserCommercialEntitlementSnapshot } from '@elceo/types';
import { validateCommercialProfileSocialIdentifier } from '@elceo/schemas';

const kickOffAllowlist: CommercialFeatureKey[] = ['dashboard.chart', 'dashboard.evidence_score', 'dashboard.macro_headlines', 'journal.page'];

function evaluate(snapshot: UserCommercialEntitlementSnapshot, featureKey: CommercialFeatureKey) {
  const now = new Date(snapshot.nowIso).getTime();
  const restricted = snapshot.userRestrictionStatus === 'suspended' || snapshot.userRestrictionStatus === 'banned';
  if (restricted) return { decision: 'deny', reason: 'restricted_user', status: 'subscription_required' as const, subscriptionWall: null };
  if (snapshot.activePlanCode === 'focus_plan' && snapshot.subscriptionActive) return { decision: 'allow', reason: 'feature_allowed', status: 'active' as const, subscriptionWall: null };
  if (snapshot.superAdminGift?.status === 'active' && new Date(snapshot.superAdminGift.endsAt).getTime() > now) return { decision: 'allow', reason: 'feature_allowed', status: 'active' as const, subscriptionWall: null };
  const trialActive = snapshot.activePlanCode === 'kick_off' && snapshot.trialStartedAt && now < new Date(snapshot.trialStartedAt).getTime() + 3 * 24 * 60 * 60 * 1000;
  if (trialActive && kickOffAllowlist.includes(featureKey)) return { decision: 'allow', reason: 'feature_allowed', status: 'trial_active' as const, subscriptionWall: null };
  if (trialActive) return { decision: 'deny', reason: 'feature_not_in_trial_allowlist', status: 'trial_active' as const, subscriptionWall: { required: true, reason: 'subscription_required', targetPlanCode: 'focus_plan' as const } };
  return { decision: 'deny', reason: 'subscription_required', status: 'subscription_required' as const, subscriptionWall: { required: true, reason: 'subscription_required', targetPlanCode: 'focus_plan' as const } };
}

export function buildRouteEntitlementDeniedResponse(code: string, status = 403, includeWall = true) { return jsonError('forbidden', 'Route access denied', includeWall ? [`code:${code}`, 'subscriptionWall:focus_plan'] : [`code:${code}`], status); }
export function guardRouteCommercialEntitlement(input: { routePath: string; method: string; featureKey: CommercialFeatureKey; snapshot: UserCommercialEntitlementSnapshot; }) {
  const result = evaluate(input.snapshot, input.featureKey);
  if (result.decision === 'allow') return { allowed: true as const, status: 200 as const, code: 'feature_allowed' as const, reason: result.reason, routePath: input.routePath, featureKey: input.featureKey, requiredPolicy: 'commercial_entitlement', entitlementStatus: result.status, subscriptionWall: null };
  const status = result.reason === 'subscription_required' ? 402 : 403;
  return { allowed: false as const, status, code: result.reason, reason: result.reason, routePath: input.routePath, featureKey: input.featureKey, requiredPolicy: 'commercial_entitlement', entitlementStatus: result.status, restrictedUser: result.reason === 'restricted_user' ? input.snapshot.userRestrictionStatus : null, subscriptionWall: result.subscriptionWall, response: buildRouteEntitlementDeniedResponse(result.reason, status, result.reason !== 'restricted_user') };
}
export function guardRoutePaymentReadiness(identifiers: CommercialProfileSocialIdentifier[]) {
  const normalized: CommercialProfileSocialIdentifier[] = [];
  for (const id of identifiers) {
    const checked = validateCommercialProfileSocialIdentifier(id);
    if (checked.ok) normalized.push(checked.value);
  }
  return normalized.length ? { status: 'eligible' as const, reason: 'ready' as const, normalizedIdentifiers: normalized } : { status: 'blocked' as const, reason: 'missing_social_identifier' as const, normalizedIdentifiers: [] };
}

export function assertRouteSubjectOwnership(input: { authenticatedSubjectId: string; routeSubjectId: string }) {
  return input.authenticatedSubjectId === input.routeSubjectId;
}

export function buildOwnerAccessDeniedResponse() {
  return jsonError('forbidden', 'Owner scope denied', ['code:owner_scope_denied'], 403);
}
