import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export type RoutePolicyClassification =
  | 'public_safe'
  | 'public_seo_safe'
  | 'authenticated_basic'
  | 'kick_off_allowed'
  | 'focus_plan_required'
  | 'subscription_required_on_expiry'
  | 'notification_preference_owner_only'
  | 'admin_read_required'
  | 'admin_ops_required'
  | 'super_admin_required'
  | 'internal_only'
  | 'blocked_live_activation'
  | 'payment_readiness_required'
  | 'no_product_entitlement_required';

export type RuntimeEnforcementExpectation = 'runtime_enforced' | 'explicitly_not_applicable' | 'blocked_or_disabled' | 'environment_verification_required';

export type RouteInventoryRow = {
  routeFile: string;
  routePath: string;
  methods: string[];
  family: string;
  classification: RoutePolicyClassification;
  runtimeExpectation: RuntimeEnforcementExpectation;
  productEntitlement: string;
  ownerBoundary: 'required' | 'not_applicable' | 'admin_target' | 'internal_operator';
  targetUserBoundary: 'required' | 'not_applicable';
  internalToken: 'required' | 'not_required';
  adminPermission: 'admin.read' | 'admin.ops' | 'super_admin' | 'not_required';
  stepUp: 'required' | 'not_required';
  idempotency: 'required' | 'not_required';
  audit: 'required' | 'not_required';
  commercialRestrictionFirst: 'required' | 'not_required';
  sideEffectRisk: 'none' | 'read' | 'mutation' | 'live_activation_blocked';
  testCoverageStatus: RuntimeEnforcementExpectation;
};

const METHOD_RE = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|as\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*[,}]/g;

function walk(dir: string): string[] {
  const entries = readdirSync(dir).sort();
  return entries.flatMap((entry) => {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) return walk(full);
    return entry === 'route.ts' ? [full] : [];
  });
}

export function routePathFromFile(routeFile: string): string {
  const rel = routeFile.split(`${sep}app${sep}api${sep}`)[1]?.replace(/\/route\.ts$/, '') ?? routeFile;
  return `/api/${rel.split(sep).join('/').replace(/\[(.+?)\]/g, '{$1}')}`;
}

function familyOf(routePath: string): string {
  const [, , family] = routePath.split('/');
  return family ?? 'api';
}

function methodsOf(source: string): string[] {
  const methods = new Set<string>();
  for (const match of source.matchAll(METHOD_RE)) methods.add(match[1] ?? match[2] ?? match[3] ?? match[4]);
  return [...methods].sort();
}

export function classifyRoute(routePath: string, methods: string[]): Omit<RouteInventoryRow, 'routeFile' | 'routePath' | 'methods' | 'family'> {
  const mutates = methods.some((method) => method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS');
  const isAdmin = routePath.startsWith('/api/admin/');
  const isInternal = routePath.startsWith('/api/internal/') || routePath.startsWith('/api/ops/');
  const isCommercialAdmin = routePath.includes('/commercial/users/') || routePath.includes('/entitlements/') || routePath.includes('/billing/');
  const blockedLive = routePath.includes('/checkout') || routePath.includes('/session') || routePath.includes('/dispatch') || routePath.includes('/provider-events') || routePath.includes('/fixture-ingest');
  let classification: RoutePolicyClassification = 'authenticated_basic';
  let runtimeExpectation: RuntimeEnforcementExpectation = 'runtime_enforced';
  let productEntitlement = 'none';
  let ownerBoundary: RouteInventoryRow['ownerBoundary'] = 'not_applicable';
  let targetUserBoundary: RouteInventoryRow['targetUserBoundary'] = 'not_applicable';
  let internalToken: RouteInventoryRow['internalToken'] = 'not_required';
  let adminPermission: RouteInventoryRow['adminPermission'] = 'not_required';
  let stepUp: RouteInventoryRow['stepUp'] = 'not_required';
  let idempotency: RouteInventoryRow['idempotency'] = mutates ? 'required' : 'not_required';
  let audit: RouteInventoryRow['audit'] = mutates ? 'required' : 'not_required';
  let commercialRestrictionFirst: RouteInventoryRow['commercialRestrictionFirst'] = 'not_required';
  let sideEffectRisk: RouteInventoryRow['sideEffectRisk'] = mutates ? 'mutation' : 'read';

  if (routePath === '/api/auth/{...nextauth}' || routePath.includes('/health')) {
    classification = 'no_product_entitlement_required'; runtimeExpectation = 'explicitly_not_applicable'; sideEffectRisk = 'none'; idempotency = 'not_required'; audit = 'not_required';
  } else if (isInternal) {
    classification = 'internal_only'; internalToken = 'required'; adminPermission = mutates ? 'admin.ops' : 'admin.read'; ownerBoundary = 'internal_operator';
  } else if (isAdmin) {
    classification = mutates ? 'admin_ops_required' : 'admin_read_required'; internalToken = 'required'; adminPermission = mutates ? 'admin.ops' : 'admin.read'; ownerBoundary = routePath.includes('/users/{userId}') ? 'admin_target' : 'internal_operator'; targetUserBoundary = routePath.includes('/users/{userId}') || routePath.includes('/subject') || isCommercialAdmin ? 'required' : 'not_applicable';
    if (routePath.includes('/commercial/users/') || routePath.includes('/entitlements/')) { classification = 'super_admin_required'; adminPermission = 'super_admin'; stepUp = 'required'; }
  } else if (routePath.startsWith('/api/dashboard/')) {
    classification = 'kick_off_allowed'; productEntitlement = 'dashboard.basic_or_focus_slice'; ownerBoundary = 'required'; commercialRestrictionFirst = 'required';
  } else if (routePath.startsWith('/api/journal/')) {
    classification = routePath.includes('/influence/') ? 'focus_plan_required' : 'kick_off_allowed'; productEntitlement = classification === 'kick_off_allowed' ? 'journal.page' : 'focus_plan'; ownerBoundary = 'required'; commercialRestrictionFirst = 'required';
  } else if (routePath.startsWith('/api/workspace/') || routePath.startsWith('/api/portfolio/') || routePath.startsWith('/api/analytics/') || routePath.startsWith('/api/coaching/') || routePath.startsWith('/api/refresh/')) {
    classification = 'focus_plan_required'; productEntitlement = 'focus_plan'; ownerBoundary = 'required'; commercialRestrictionFirst = 'required';
  } else if (routePath.startsWith('/api/notifications/')) {
    classification = routePath.includes('/delivery/dispatch') ? 'internal_only' : 'notification_preference_owner_only'; ownerBoundary = routePath.includes('/delivery/dispatch') ? 'internal_operator' : 'required'; productEntitlement = routePath.includes('/delivery/dispatch') ? 'none' : 'notification_preferences'; internalToken = routePath.includes('/delivery/dispatch') ? 'required' : 'not_required'; commercialRestrictionFirst = routePath.includes('/summary') ? 'required' : 'not_required';
  } else if (routePath.startsWith('/api/billing/') || routePath.startsWith('/api/account/billing')) {
    classification = 'payment_readiness_required'; ownerBoundary = 'required'; productEntitlement = 'payment_readiness';
  } else if (routePath.startsWith('/api/account/')) {
    classification = 'authenticated_basic'; ownerBoundary = 'required';
  }
  if (blockedLive) { classification = routePath.includes('/checkout') || routePath.includes('/session') || routePath.includes('/dispatch') ? 'blocked_live_activation' : classification; runtimeExpectation = routePath.includes('/provider-events') ? 'environment_verification_required' : 'blocked_or_disabled'; sideEffectRisk = 'live_activation_blocked'; }
  return { classification, runtimeExpectation, productEntitlement, ownerBoundary, targetUserBoundary, internalToken, adminPermission, stepUp, idempotency, audit, commercialRestrictionFirst, sideEffectRisk, testCoverageStatus: runtimeExpectation };
}

export function buildRouteInventory(appApiDir = join(process.cwd(), 'app/api')): RouteInventoryRow[] {
  return walk(appApiDir).map((file) => {
    const source = readFileSync(file, 'utf8');
    const routeFile = relative(process.cwd(), file).split(sep).join('/');
    const routePath = routePathFromFile(file);
    const methods = methodsOf(source);
    return { routeFile, routePath, methods, family: familyOf(routePath), ...classifyRoute(routePath, methods) };
  }).sort((a, b) => a.routePath.localeCompare(b.routePath));
}
