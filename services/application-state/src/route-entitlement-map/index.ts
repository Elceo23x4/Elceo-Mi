import type { RouteEntitlementRecord } from '@elceo/types';

export const ROUTE_ENTITLEMENT_MAP = [
  { method:'GET', path:'/api/dashboard/[asset]', policy:'kick_off_allowed', featureKey:'dashboard.chart', sensitivity:'high', requiredGuard:'guardRouteCommercialEntitlement' },
  { method:'GET', path:'/api/journal/entries', policy:'kick_off_allowed', featureKey:'journal.page', sensitivity:'high', requiredGuard:'guardRouteCommercialEntitlement' },
  { method:'GET', path:'/api/analytics/latest', policy:'focus_plan_required', featureKey:'dashboard.full_cognition', sensitivity:'high', requiredGuard:'requireFeatureAccess+guardRouteCommercialEntitlement' },
  { method:'GET', path:'/api/coaching/latest', policy:'focus_plan_required', featureKey:'dashboard.full_cognition', sensitivity:'high', requiredGuard:'requireFeatureAccess+guardRouteCommercialEntitlement' },
  { method:'GET', path:'/api/portfolio/watchlist', policy:'focus_plan_required', featureKey:'portfolio.advanced', sensitivity:'high', requiredGuard:'requireFeatureAccess+guardRouteCommercialEntitlement' },
  { method:'POST', path:'/api/portfolio/watchlist', policy:'focus_plan_required', featureKey:'portfolio.advanced', sensitivity:'high', requiredGuard:'requireFeatureAccess+guardRouteCommercialEntitlement' },
  { method:'GET', path:'/api/notifications/summary', policy:'focus_plan_required', featureKey:'notification.advanced_preferences', sensitivity:'high', requiredGuard:'requireFeatureAccess+guardRouteCommercialEntitlement' },
  { method:'POST', path:'/api/billing/checkout', policy:'payment_readiness_required', featureKey:'checkout.focus_plan_prepare', sensitivity:'critical', requiredGuard:'buildRouteEntitlementDeniedResponse' },
  { method:'POST', path:'/api/billing/checkout', policy:'blocked_live_activation', featureKey:'payment.korapay_checkout_readiness', sensitivity:'critical', requiredGuard:'buildRouteEntitlementDeniedResponse' },
  { method:'GET', path:'/api/admin/commercial/metrics', policy:'admin_read_required', featureKey:'admin.metrics', sensitivity:'critical', requiredGuard:'requireInternalRouteAccess+requireFeatureAccess' },
  { method:'GET', path:'/api/admin/market-evidence/cognition', policy:'admin_read_required', featureKey:'admin.operator_inspection', sensitivity:'critical', requiredGuard:'requireInternalRouteAccess+requireFeatureAccess' },
  { method:'GET', path:'/api/admin/market-evidence/weighted', policy:'admin_read_required', featureKey:'admin.operator_inspection', sensitivity:'critical', requiredGuard:'requireInternalRouteAccess+requireFeatureAccess' },
  { method:'GET', path:'/api/admin/market-evidence/scheduled-ingestion/runs', policy:'admin_read_required', featureKey:'admin.scheduled_ingestion', sensitivity:'critical', requiredGuard:'requireInternalRouteAccess+requireFeatureAccess' },
  { method:'POST', path:'/api/admin/market-evidence/scheduled-ingestion/dry-run', policy:'admin_ops_required', featureKey:'admin.scheduled_ingestion', sensitivity:'critical', requiredGuard:'requireInternalRouteAccess+requireFeatureAccess+requireSecurityDecision' },
  { method:'POST', path:'/api/internal/market-evidence/tiingo/fixture-ingest', policy:'internal_only', featureKey:null, sensitivity:'critical', requiredGuard:'requireInternalRouteAccess+requireFeatureAccess+requireSecurityDecision' }
] as const satisfies RouteEntitlementRecord[];

export const ROUTE_FAMILY_AUDIT_STATUS = {
  analytics: 'commercial_runtime_guarded',
  coaching: 'commercial_runtime_guarded',
  portfolio: 'commercial_runtime_guarded',
  notifications: 'commercial_runtime_guarded',
  'billing/checkout': 'helper_guarded',
  'account/profile': 'policy_only',
  dashboard: 'helper_guarded',
  'market-evidence': 'route_runtime_tested',
  'market-evidence user-facing': 'not_present',
  'frontend contracts/mock payloads': 'lower_level_tested',
  journal: 'helper_guarded',
  'journal deep-analysis': 'not_present',
  workspace: 'feature_permission_guarded',
  auth: 'policy_only',
  admin: 'route_runtime_tested',
  internal: 'route_runtime_tested',
  'scheduled-ingestion': 'route_runtime_tested',
  'operator inspection': 'route_runtime_tested',
  'provider activation': 'policy_only',
  'Super Admin metrics': 'policy_only',
  'SEO/programmatic': 'not_present',
  'observability/audit': 'route_runtime_tested',
  'KoraPay/payment readiness routes if present': 'helper_guarded'
} as const;

export const ROUTE_ENTITLEMENT_MAP_SORTED: RouteEntitlementRecord[] = [...ROUTE_ENTITLEMENT_MAP].sort((a,b)=>(`${a.method}:${a.path}`).localeCompare(`${b.method}:${b.path}`));

export const classifyRouteEntitlementPolicy = (method: string, path: string) => ROUTE_ENTITLEMENT_MAP_SORTED.find((r) => r.method === method && r.path === path) ?? null;
