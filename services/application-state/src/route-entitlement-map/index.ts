import type { RouteEntitlementRecord } from '@elceo/types';

export const ROUTE_ENTITLEMENT_MAP = [
  { method:'GET', path:'/api/dashboard/[asset]', policy:'kick_off_allowed', featureKey:'dashboard.chart', sensitivity:'high', requiredGuard:'guardRouteCommercialEntitlement' },
  { method:'GET', path:'/api/journal/entries', policy:'kick_off_allowed', featureKey:'journal.page', sensitivity:'high', requiredGuard:'guardRouteCommercialEntitlement' },
  { method:'POST', path:'/api/billing/checkout', policy:'payment_readiness_required', featureKey:'checkout.focus_plan_prepare', sensitivity:'critical', requiredGuard:'buildRouteEntitlementDeniedResponse' },
  { method:'POST', path:'/api/billing/checkout', policy:'blocked_live_activation', featureKey:'payment.korapay_checkout_readiness', sensitivity:'critical', requiredGuard:'buildRouteEntitlementDeniedResponse' },
  { method:'GET', path:'/api/admin/commercial/metrics', policy:'admin_read_required', featureKey:'admin.metrics', sensitivity:'critical', requiredGuard:'requireInternalRouteAccess+requireFeatureAccess' }
] as const satisfies RouteEntitlementRecord[];

export const ROUTE_ENTITLEMENT_MAP_SORTED: RouteEntitlementRecord[] = [...ROUTE_ENTITLEMENT_MAP].sort((a,b)=>(`${a.method}:${a.path}`).localeCompare(`${b.method}:${b.path}`));

export const classifyRouteEntitlementPolicy = (method: string, path: string) => ROUTE_ENTITLEMENT_MAP_SORTED.find((r) => r.method === method && r.path === path) ?? null;
