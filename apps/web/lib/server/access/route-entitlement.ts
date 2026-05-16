import { jsonError } from '@/lib/server/api';
import { checkCommercialPaymentReadiness, guardCommercialFeatureAccess } from '@elceo/application-state';
import type { CommercialFeatureKey, UserCommercialEntitlementSnapshot } from '@elceo/types';

export function buildRouteEntitlementDeniedResponse(code: string, status = 403, includeWall = true) {
  return jsonError('forbidden', 'Route access denied', includeWall ? [`code:${code}`, 'subscriptionWall:focus_plan'] : [`code:${code}`], status);
}

export function guardRouteCommercialEntitlement(snapshot: UserCommercialEntitlementSnapshot, featureKey: CommercialFeatureKey) {
  const result = guardCommercialFeatureAccess({ snapshot, featureKey });
  if (result.decision === 'allow') return { allowed: true as const, reason: result.reason, subscriptionWall: null };
  const status = result.reason === 'subscription_required' ? 402 : 403;
  return { allowed: false as const, reason: result.reason, subscriptionWall: result.subscriptionWall, status };
}

export function guardRoutePaymentReadiness(identifiers: UserCommercialEntitlementSnapshot['socialIdentifiers']) {
  const readiness = checkCommercialPaymentReadiness({ identifiers });
  return readiness;
}
