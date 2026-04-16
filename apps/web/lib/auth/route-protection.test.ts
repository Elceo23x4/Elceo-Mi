import { evaluateRouteGuard } from './route-protection';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

export function runRouteProtectionTests(): void {
  const unauth = evaluateRouteGuard({ pathname: '/dashboard', isAuthenticated: false, role: 'user' });
  assert(!unauth.allow && Boolean(unauth.redirectTo?.startsWith('/login')), 'protected routes must require auth');

  const nonAdmin = evaluateRouteGuard({ pathname: '/admin', isAuthenticated: true, role: 'user' });
  assert(!nonAdmin.allow && nonAdmin.redirectTo === '/dashboard', 'admin route must enforce admin roles');

  const admin = evaluateRouteGuard({ pathname: '/admin', isAuthenticated: true, role: 'support_admin' });
  assert(admin.allow, 'support admin role must pass');
}
