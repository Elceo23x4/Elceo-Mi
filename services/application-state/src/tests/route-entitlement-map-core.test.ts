import assert from 'node:assert/strict';
import { ROUTE_ENTITLEMENT_MAP_SORTED, classifyRouteEntitlementPolicy } from '../route-entitlement-map/index';
import { evaluateCommercialFeatureAccess } from '../commercial-entitlements/index';

export async function runRouteEntitlementMapCoreTests(): Promise<void> {
  assert.equal(ROUTE_ENTITLEMENT_MAP_SORTED.length > 0, true);
  const sorted = [...ROUTE_ENTITLEMENT_MAP_SORTED].map((x) => `${x.method}:${x.path}`);
  assert.deepEqual(sorted, [...sorted].sort());
  assert.equal(classifyRouteEntitlementPolicy('GET', '/api/dashboard/[asset]')?.policy, 'kick_off_allowed');
  const activeTrial = {userId:'u1',nowIso:'2026-05-15T00:00:00.000Z',trialStartedAt:'2026-05-14T00:00:00.000Z',activePlanCode:'kick_off' as const,subscriptionActive:false,socialIdentifiers:[],userRestrictionStatus:'none' as const};
  assert.equal(evaluateCommercialFeatureAccess({ snapshot: activeTrial, featureKey: 'dashboard.chart' }).decision, 'allow');
  assert.equal(evaluateCommercialFeatureAccess({ snapshot: activeTrial, featureKey: 'premium.full_access' }).decision, 'deny');
}
