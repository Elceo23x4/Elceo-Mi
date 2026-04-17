export type RouteGuardInput = {
  pathname: string;
  isAuthenticated: boolean;
  role: string;
};

export type RouteGuardDecision = {
  allow: boolean;
  redirectTo?: string;
};

const adminRoles = new Set(['super_admin', 'analyst_admin', 'support_admin']);

export function evaluateRouteGuard(input: RouteGuardInput): RouteGuardDecision {
  const protectedPrefixes = ['/dashboard', '/portfolio', '/journal', '/analytics', '/settings', '/admin', '/onboarding'];
  const isProtected = protectedPrefixes.some((prefix) => input.pathname.startsWith(prefix));

  if (!isProtected) return { allow: true };
  if (!input.isAuthenticated) return { allow: false, redirectTo: `/login?callbackUrl=${encodeURIComponent(input.pathname)}` };

  if (input.pathname.startsWith('/admin') && !adminRoles.has(input.role)) {
    return { allow: false, redirectTo: '/dashboard' };
  }

  return { allow: true };
}
