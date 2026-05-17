import assert from 'node:assert/strict';
import { ROUTE_ENTITLEMENT_MAP_SORTED, ROUTE_FAMILY_AUDIT_STATUS, classifyRouteEntitlementPolicy } from '../route-entitlement-map/index';
import { evaluateCommercialFeatureAccess } from '../commercial-entitlements/index';
import type { RouteEntitlementFeatureKey } from '@elceo/types';

export async function runRouteEntitlementMapCoreTests(): Promise<void> {
  assert.equal(ROUTE_ENTITLEMENT_MAP_SORTED.length > 0, true);
  const sorted = [...ROUTE_ENTITLEMENT_MAP_SORTED].map((x) => `${x.method}:${x.path}`);
  assert.deepEqual(sorted, [...sorted].sort());
  assert.equal(classifyRouteEntitlementPolicy('GET', '/api/dashboard/[asset]')?.policy, 'kick_off_allowed');
  assert.equal(classifyRouteEntitlementPolicy('GET', '/api/analytics/latest')?.policy, 'focus_plan_required');
  const activeTrial = {userId:'u1',nowIso:'2026-05-15T00:00:00.000Z',trialStartedAt:'2026-05-14T00:00:00.000Z',activePlanCode:'kick_off' as const,subscriptionActive:false,socialIdentifiers:[],userRestrictionStatus:'none' as const};
  const expiredTrial = { ...activeTrial, trialStartedAt: '2026-05-01T00:00:00.000Z' };
  const restricted = { ...activeTrial, userRestrictionStatus: 'suspended' as const, activePlanCode: 'focus_plan' as const, subscriptionActive: true };
  const focusActive = { ...activeTrial, activePlanCode: 'focus_plan' as const, subscriptionActive: true };
  const giftActive = { ...activeTrial, superAdminGift: { status: 'active' as const, grantedAt: '2026-05-10T00:00:00.000Z', endsAt: '2026-05-18T00:00:00.000Z' } };
  const giftExpired = { ...activeTrial, superAdminGift: { status: 'expired' as const, grantedAt: '2026-05-01T00:00:00.000Z', endsAt: '2026-05-02T00:00:00.000Z' } };
  assert.equal(evaluateCommercialFeatureAccess({ snapshot: activeTrial, featureKey: 'dashboard.chart' }).decision, 'allow');
  assert.equal(evaluateCommercialFeatureAccess({ snapshot: activeTrial, featureKey: 'premium.full_access' }).decision, 'deny');
  assert.equal(evaluateCommercialFeatureAccess({ snapshot: expiredTrial, featureKey: 'dashboard.chart' }).status, 'subscription_required');
  assert.equal(evaluateCommercialFeatureAccess({ snapshot: restricted, featureKey: 'premium.full_access' }).reason, 'subscription_required');
  assert.equal(evaluateCommercialFeatureAccess({ snapshot: focusActive, featureKey: 'premium.full_access' }).decision, 'allow');
  assert.equal(evaluateCommercialFeatureAccess({ snapshot: giftActive, featureKey: 'premium.full_access' }).decision, 'allow');
  assert.equal(evaluateCommercialFeatureAccess({ snapshot: giftExpired, featureKey: 'premium.full_access' }).decision, 'deny');

  assert.equal(ROUTE_FAMILY_AUDIT_STATUS.analytics, 'commercial_runtime_guarded');
  assert.equal(ROUTE_FAMILY_AUDIT_STATUS['SEO/programmatic'], 'not_present');

  const premiumFeatureKeys: RouteEntitlementFeatureKey[] = [
    'market_evidence.confidence_decomposition',
    'market_evidence.contradiction_panel',
    'market_evidence.risk_liquidity',
    'market_evidence.provider_readiness',
    'journal.cognition_linked_suggestions'
  ];
  assert.equal(premiumFeatureKeys.length, 5);
  const kickOffRoutes = ROUTE_ENTITLEMENT_MAP_SORTED.filter((x) => x.policy === 'kick_off_allowed');
  for (const key of premiumFeatureKeys) {
    assert.equal(kickOffRoutes.some((x) => x.featureKey === key), false);
  }

  assert.equal(ROUTE_FAMILY_AUDIT_STATUS['market-evidence user-facing'], 'not_present');
  assert.equal(ROUTE_FAMILY_AUDIT_STATUS['market-evidence'], 'route_runtime_tested');
  assert.equal(ROUTE_FAMILY_AUDIT_STATUS['journal deep-analysis'], 'not_present');

  const adminCognition = classifyRouteEntitlementPolicy('GET', '/api/admin/market-evidence/cognition');
  const adminWeighted = classifyRouteEntitlementPolicy('GET', '/api/admin/market-evidence/weighted');
  const adminScheduledRuns = classifyRouteEntitlementPolicy('GET', '/api/admin/market-evidence/scheduled-ingestion/runs');
  const internalFixtureIngest = classifyRouteEntitlementPolicy('POST', '/api/internal/market-evidence/tiingo/fixture-ingest');

  assert.equal(adminCognition?.policy, 'admin_read_required');
  assert.equal(adminWeighted?.policy, 'admin_read_required');
  assert.equal(adminScheduledRuns?.policy, 'admin_read_required');
  assert.equal(internalFixtureIngest?.policy, 'internal_only');
  assert.equal(adminCognition?.featureKey, 'admin.operator_inspection');
  assert.equal(adminScheduledRuns?.featureKey, 'admin.scheduled_ingestion');
  assert.equal(internalFixtureIngest?.featureKey, null);
}
