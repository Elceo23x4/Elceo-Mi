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

export type RouteHandlerGuardEvidence = {
  requiresInternalRequestCall: boolean;
  requireFeatureAccessCall: boolean;
  guardRouteCommercialEntitlementCall: boolean;
  authenticatedSubjectResolverCall: boolean;
  stepUpChallengeReference: boolean;
  idempotencyKeyReference: boolean;
  securityDecisionReference: boolean;
  auditReference: boolean;
  ownerSubjectReference: boolean;
  targetUserReference: boolean;
  blockedLiveActivationReference: boolean;
  helperWrapperEvidence: string[];
};

export type RouteRuntimeAssertion =
  | 'unauthenticated_denied'
  | 'internal_token_required'
  | 'admin_permission_required'
  | 'owner_boundary_enforced'
  | 'target_user_boundary_enforced'
  | 'commercial_restriction_first'
  | 'entitlement_denied_before_payload'
  | 'step_up_required'
  | 'idempotency_replay_or_conflict'
  | 'audit_or_security_decision_recorded'
  | 'blocked_live_activation'
  | 'validation_before_side_effect'
  | 'side_effect_not_called_on_denial';

export type RouteRuntimeEvidence = {
  routePath: string;
  methodsTested: string[];
  testedAssertions: RouteRuntimeAssertion[];
  evidenceLevel: 'direct_route' | 'helper_family' | 'environment' | 'blocked';
  helperName?: string;
};

export type DeclaredPolicyExpectation = {
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
};

export type RouteInventoryRow = DeclaredPolicyExpectation & {
  routeFile: string;
  routePath: string;
  methods: string[];
  family: string;
  declaredPolicyExpectation: DeclaredPolicyExpectation;
  handlerGuardEvidence: RouteHandlerGuardEvidence;
  runtimeTestEvidence: RouteRuntimeEvidence;
  testCoverageStatus: RuntimeEnforcementExpectation;
};

const METHOD_RE = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|as\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b|\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*[,}]/g;

const directRuntimeEvidence: Record<string, RouteRuntimeEvidence> = {
  '/api/workspace/current': { routePath: '/api/workspace/current', methodsTested: ['GET'], evidenceLevel: 'direct_route', testedAssertions: ['unauthenticated_denied', 'commercial_restriction_first'] },
  '/api/workspace/history': { routePath: '/api/workspace/history', methodsTested: ['GET'], evidenceLevel: 'direct_route', testedAssertions: ['owner_boundary_enforced'] },
  '/api/workspace/refresh': { routePath: '/api/workspace/refresh', methodsTested: ['POST'], evidenceLevel: 'direct_route', testedAssertions: ['validation_before_side_effect', 'idempotency_replay_or_conflict', 'audit_or_security_decision_recorded', 'commercial_restriction_first'] },
  '/api/dashboard/{asset}': { routePath: '/api/dashboard/{asset}', methodsTested: ['GET'], evidenceLevel: 'direct_route', testedAssertions: ['commercial_restriction_first', 'entitlement_denied_before_payload'] },
  '/api/journal/cases': { routePath: '/api/journal/cases', methodsTested: ['GET', 'POST'], evidenceLevel: 'direct_route', testedAssertions: ['idempotency_replay_or_conflict', 'audit_or_security_decision_recorded', 'commercial_restriction_first'] },
  '/api/journal/influence/generate': { routePath: '/api/journal/influence/generate', methodsTested: ['POST'], evidenceLevel: 'direct_route', testedAssertions: ['commercial_restriction_first', 'entitlement_denied_before_payload', 'side_effect_not_called_on_denial', 'idempotency_replay_or_conflict'] },
  '/api/portfolio/watchlist': { routePath: '/api/portfolio/watchlist', methodsTested: ['GET', 'POST'], evidenceLevel: 'direct_route', testedAssertions: ['owner_boundary_enforced', 'commercial_restriction_first', 'idempotency_replay_or_conflict', 'audit_or_security_decision_recorded'] },
  '/api/portfolio/watchlist/{entryId}': { routePath: '/api/portfolio/watchlist/{entryId}', methodsTested: ['PATCH'], evidenceLevel: 'direct_route', testedAssertions: ['owner_boundary_enforced', 'idempotency_replay_or_conflict'] },
  '/api/portfolio/positions/{positionId}/open': { routePath: '/api/portfolio/positions/{positionId}/open', methodsTested: ['POST'], evidenceLevel: 'direct_route', testedAssertions: ['owner_boundary_enforced', 'idempotency_replay_or_conflict', 'audit_or_security_decision_recorded'] },
  '/api/analytics/latest': { routePath: '/api/analytics/latest', methodsTested: ['GET'], evidenceLevel: 'direct_route', testedAssertions: ['commercial_restriction_first'] },
  '/api/analytics/generate': { routePath: '/api/analytics/generate', methodsTested: ['POST'], evidenceLevel: 'direct_route', testedAssertions: ['idempotency_replay_or_conflict', 'commercial_restriction_first'] },
  '/api/coaching/generate': { routePath: '/api/coaching/generate', methodsTested: ['POST'], evidenceLevel: 'direct_route', testedAssertions: ['idempotency_replay_or_conflict', 'commercial_restriction_first'] },
  '/api/refresh/run': { routePath: '/api/refresh/run', methodsTested: ['POST'], evidenceLevel: 'direct_route', testedAssertions: ['idempotency_replay_or_conflict', 'audit_or_security_decision_recorded', 'commercial_restriction_first'] },
  '/api/account/access-check': { routePath: '/api/account/access-check', methodsTested: ['POST'], evidenceLevel: 'direct_route', testedAssertions: ['owner_boundary_enforced'] },
  '/api/account/profile/social-identifiers': { routePath: '/api/account/profile/social-identifiers', methodsTested: ['GET', 'PATCH'], evidenceLevel: 'direct_route', testedAssertions: ['unauthenticated_denied', 'owner_boundary_enforced', 'validation_before_side_effect'] },
  '/api/notifications/summary': { routePath: '/api/notifications/summary', methodsTested: ['GET'], evidenceLevel: 'direct_route', testedAssertions: ['owner_boundary_enforced', 'commercial_restriction_first'] },
  '/api/notifications/subscriptions/{subscriptionId}': { routePath: '/api/notifications/subscriptions/{subscriptionId}', methodsTested: ['PATCH'], evidenceLevel: 'direct_route', testedAssertions: ['owner_boundary_enforced', 'idempotency_replay_or_conflict'] },
  '/api/notifications/delivery/dispatch': { routePath: '/api/notifications/delivery/dispatch', methodsTested: ['POST'], evidenceLevel: 'blocked', testedAssertions: ['internal_token_required', 'blocked_live_activation', 'idempotency_replay_or_conflict'] },
  '/api/admin/commercial/users/{userId}/restrict': { routePath: '/api/admin/commercial/users/{userId}/restrict', methodsTested: ['POST'], evidenceLevel: 'direct_route', testedAssertions: ['internal_token_required', 'admin_permission_required', 'target_user_boundary_enforced', 'step_up_required', 'idempotency_replay_or_conflict', 'audit_or_security_decision_recorded'] },
  '/api/admin/commercial/users/{userId}/gift-focus-plan': { routePath: '/api/admin/commercial/users/{userId}/gift-focus-plan', methodsTested: ['POST'], evidenceLevel: 'direct_route', testedAssertions: ['internal_token_required', 'admin_permission_required', 'target_user_boundary_enforced', 'step_up_required', 'idempotency_replay_or_conflict', 'audit_or_security_decision_recorded'] },
  '/api/admin/billing/trial': { routePath: '/api/admin/billing/trial', methodsTested: ['POST'], evidenceLevel: 'direct_route', testedAssertions: ['internal_token_required', 'admin_permission_required', 'target_user_boundary_enforced', 'idempotency_replay_or_conflict'] },
  '/api/internal/billing/reconcile': { routePath: '/api/internal/billing/reconcile', methodsTested: ['POST'], evidenceLevel: 'direct_route', testedAssertions: ['internal_token_required', 'admin_permission_required', 'idempotency_replay_or_conflict'] }
};

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

function evidenceFromSource(source: string): RouteHandlerGuardEvidence {
  const hasSecurityDecision = /requireSecurityDecision|completeSecurityDecision|failSecurityDecision/.test(source);
  const helperWrapperEvidence: string[] = [];
  if (/requireFeatureAccess/.test(source)) helperWrapperEvidence.push('requireFeatureAccess->requireAuthenticatedSubject+feature-decision');
  if (/requireSecurityDecision/.test(source)) helperWrapperEvidence.push('requireSecurityDecision->idempotency+rate-limit+security-decision');
  if (/withApiErrorBoundary/.test(source)) helperWrapperEvidence.push('withApiErrorBoundary->safe-error-envelope');
  return {
    requiresInternalRequestCall: /requireInternalRouteAccess|requireInternalRequest|x-elceo-internal-token|internal-token/.test(source),
    requireFeatureAccessCall: /requireFeatureAccess/.test(source),
    guardRouteCommercialEntitlementCall: /guardRouteCommercialEntitlement/.test(source),
    authenticatedSubjectResolverCall: /requireAuthenticatedSubject|requireAppUserState|requireOnboardedAppUserState|requireFeatureAccess/.test(source),
    stepUpChallengeReference: /stepUp|step-up|challengeId|consume.*Challenge|status:\s*['"]verified['"]|verifiedChallenge|challenge/.test(source),
    idempotencyKeyReference: /Idempotency-Key|idempotencyKey|requireSecurityDecision|completeSecurityDecision|getIdempotency/.test(source),
    securityDecisionReference: hasSecurityDecision,
    auditReference: /auditInternalMutation|recordSecurityAuditEvent|audit/.test(source),
    ownerSubjectReference: /subject\.subjectId|subjectId:\s*subject\.subjectId|access\.subject\.subjectId|assertRouteSubjectOwnership|userId\)|subject\.userId/.test(source),
    targetUserReference: /targetUserId|params\.userId|userId\}|subjectId/.test(source),
    blockedLiveActivationReference: /blocked_live_activation|blockedLive|readiness|dry-run|dryRun|missing_social_identifier|dispatchDue|checkout|portal|provider-events/.test(source),
    helperWrapperEvidence
  };
}

function isAdminBillingTargetRoute(routePath: string): boolean {
  return /^\/api\/admin\/billing\/(trial|activate|renew|change-plan|past-due|cancel-at-period-end|expire|pause|resume)$/.test(routePath) || routePath.endsWith('/operations/subject') || routePath.endsWith('/orchestration/subject');
}

export function classifyRoute(routePath: string, methods: string[]): DeclaredPolicyExpectation {
  const mutates = methods.some((method) => method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS');
  const isAdmin = routePath.startsWith('/api/admin/');
  const isInternal = routePath.startsWith('/api/internal/') || routePath.startsWith('/api/ops/');
  const blockedLive = routePath.includes('/checkout') || routePath.includes('/session') || routePath.includes('/dispatch') || routePath.includes('/provider-events') || routePath.includes('/fixture-ingest');
  let classification: RoutePolicyClassification = 'authenticated_basic';
  let runtimeExpectation: RuntimeEnforcementExpectation = 'runtime_enforced';
  let productEntitlement = 'none';
  let ownerBoundary: DeclaredPolicyExpectation['ownerBoundary'] = 'not_applicable';
  let targetUserBoundary: DeclaredPolicyExpectation['targetUserBoundary'] = 'not_applicable';
  let internalToken: DeclaredPolicyExpectation['internalToken'] = 'not_required';
  let adminPermission: DeclaredPolicyExpectation['adminPermission'] = 'not_required';
  let stepUp: DeclaredPolicyExpectation['stepUp'] = 'not_required';
  let idempotency: DeclaredPolicyExpectation['idempotency'] = mutates ? 'required' : 'not_required';
  let audit: DeclaredPolicyExpectation['audit'] = mutates ? 'required' : 'not_required';
  let commercialRestrictionFirst: DeclaredPolicyExpectation['commercialRestrictionFirst'] = 'not_required';
  let sideEffectRisk: DeclaredPolicyExpectation['sideEffectRisk'] = mutates ? 'mutation' : 'read';

  if (routePath === '/api/auth/{...nextauth}' || routePath.includes('/health')) {
    classification = 'no_product_entitlement_required'; runtimeExpectation = 'explicitly_not_applicable'; sideEffectRisk = 'none'; idempotency = 'not_required'; audit = 'not_required';
  } else if (isInternal) {
    classification = 'internal_only'; internalToken = 'required'; adminPermission = mutates ? 'admin.ops' : 'admin.read'; ownerBoundary = 'internal_operator';
  } else if (isAdmin) {
    classification = mutates ? 'admin_ops_required' : 'admin_read_required'; internalToken = 'required'; adminPermission = mutates ? 'admin.ops' : 'admin.read'; ownerBoundary = routePath.includes('/users/{userId}') ? 'admin_target' : 'internal_operator'; targetUserBoundary = routePath.includes('/users/{userId}') || isAdminBillingTargetRoute(routePath) || routePath.startsWith('/api/admin/entitlements/') ? 'required' : 'not_applicable';
    if (mutates && routePath.includes('/commercial/users/')) { classification = 'super_admin_required'; adminPermission = 'super_admin'; stepUp = 'required'; }
  } else if (routePath.startsWith('/api/dashboard/')) {
    classification = 'kick_off_allowed'; productEntitlement = 'dashboard.basic_or_focus_slice'; ownerBoundary = 'required'; commercialRestrictionFirst = 'required';
  } else if (routePath.startsWith('/api/journal/')) {
    classification = routePath.includes('/influence/') ? 'focus_plan_required' : 'kick_off_allowed'; productEntitlement = classification === 'kick_off_allowed' ? 'journal.page' : 'focus_plan'; ownerBoundary = 'required'; commercialRestrictionFirst = 'required';
  } else if (routePath.startsWith('/api/workspace/') || routePath.startsWith('/api/portfolio/') || routePath.startsWith('/api/analytics/') || routePath.startsWith('/api/coaching/') || routePath.startsWith('/api/refresh/')) {
    classification = 'focus_plan_required'; productEntitlement = 'focus_plan'; ownerBoundary = 'required'; commercialRestrictionFirst = 'required';
  } else if (routePath.startsWith('/api/notifications/')) {
    classification = routePath.includes('/delivery/dispatch') ? 'internal_only' : 'notification_preference_owner_only'; ownerBoundary = routePath.includes('/delivery/dispatch') ? 'internal_operator' : 'required'; productEntitlement = routePath.includes('/delivery/dispatch') ? 'none' : 'notification_preferences'; internalToken = routePath.includes('/delivery/dispatch') ? 'required' : 'not_required'; commercialRestrictionFirst = routePath.includes('/summary') ? 'required' : 'not_required';
  } else if (routePath === '/api/billing/webhook') {
    classification = 'payment_readiness_required'; runtimeExpectation = 'environment_verification_required'; internalToken = 'not_required'; adminPermission = 'not_required'; ownerBoundary = 'not_applicable'; productEntitlement = 'provider_webhook_signature';
  } else if (routePath.startsWith('/api/billing/') || routePath.startsWith('/api/account/billing')) {
    classification = 'payment_readiness_required'; ownerBoundary = 'required'; productEntitlement = 'payment_readiness';
  } else if (routePath.startsWith('/api/account/')) {
    classification = 'authenticated_basic'; ownerBoundary = 'required';
  }
  if (blockedLive) { classification = routePath.includes('/checkout') || routePath.includes('/session') || routePath.includes('/dispatch') ? 'blocked_live_activation' : classification; runtimeExpectation = routePath.includes('/provider-events') ? 'environment_verification_required' : 'blocked_or_disabled'; sideEffectRisk = 'live_activation_blocked'; }
  return { classification, runtimeExpectation, productEntitlement, ownerBoundary, targetUserBoundary, internalToken, adminPermission, stepUp, idempotency, audit, commercialRestrictionFirst, sideEffectRisk };
}

export function getRuntimeEvidenceForRoute(routePath: string, policy: DeclaredPolicyExpectation): RouteRuntimeEvidence {
  const direct = directRuntimeEvidence[routePath];
  if (direct) return direct;
  if (policy.runtimeExpectation === 'environment_verification_required') return { routePath, methodsTested: [], evidenceLevel: 'environment', testedAssertions: ['internal_token_required'], helperName: 'environment verification: provider event provenance' };
  if (policy.runtimeExpectation === 'blocked_or_disabled' || policy.classification === 'blocked_live_activation') return { routePath, methodsTested: [], evidenceLevel: 'blocked', testedAssertions: ['blocked_live_activation'], helperName: 'blocked-live/readiness route behavior' };
  if (routePath.startsWith('/api/admin/')) return { routePath, methodsTested: [], evidenceLevel: 'helper_family', helperName: 'admin route helper family', testedAssertions: ['internal_token_required', 'admin_permission_required', ...(policy.targetUserBoundary === 'required' ? ['target_user_boundary_enforced' as const] : []), ...(policy.stepUp === 'required' ? ['step_up_required' as const] : [])] };
  if (routePath.startsWith('/api/internal/') || routePath.startsWith('/api/ops/')) return { routePath, methodsTested: [], evidenceLevel: 'helper_family', helperName: 'internal/ops route helper family', testedAssertions: ['internal_token_required', 'admin_permission_required'] };
  if (policy.ownerBoundary === 'required') return { routePath, methodsTested: [], evidenceLevel: 'helper_family', helperName: 'authenticated owner subject route family', testedAssertions: ['unauthenticated_denied', 'owner_boundary_enforced', ...(policy.commercialRestrictionFirst === 'required' ? ['commercial_restriction_first' as const] : [])] };
  return { routePath, methodsTested: [], evidenceLevel: 'helper_family', helperName: 'framework/non-product route family', testedAssertions: [] };
}

export function buildRouteInventory(appApiDir = join(process.cwd(), 'app/api')): RouteInventoryRow[] {
  return walk(appApiDir).map((file) => {
    const source = readFileSync(file, 'utf8');
    const routeFile = relative(process.cwd(), file).split(sep).join('/');
    const routePath = routePathFromFile(file);
    const methods = methodsOf(source);
    const declaredPolicyExpectation = classifyRoute(routePath, methods);
    const handlerGuardEvidence = evidenceFromSource(source);
    const runtimeTestEvidence = getRuntimeEvidenceForRoute(routePath, declaredPolicyExpectation);
    return { routeFile, routePath, methods, family: familyOf(routePath), ...declaredPolicyExpectation, declaredPolicyExpectation, handlerGuardEvidence, runtimeTestEvidence, testCoverageStatus: declaredPolicyExpectation.runtimeExpectation };
  }).sort((a, b) => a.routePath.localeCompare(b.routePath));
}
