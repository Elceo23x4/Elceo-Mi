import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { evaluateRouteGuard } from './lib/auth/route-protection';

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('x-content-type-options', 'nosniff');
  response.headers.set('x-frame-options', 'DENY');
  response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('x-elceo-security', 'middleware-v1');
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const secret = runtimeEnv().AUTH_SECRET;
  const token = await getToken(secret ? { req: request, secret } : { req: request });

  const decision = evaluateRouteGuard({
    pathname,
    isAuthenticated: Boolean(token?.sub),
    role: String(token?.role ?? 'user')
  });

  if (!decision.allow && decision.redirectTo) {
    const redirect = NextResponse.redirect(new URL(decision.redirectTo, request.url));
    return applySecurityHeaders(redirect);
  }

  const response = NextResponse.next();
  response.headers.set('x-request-id', request.headers.get('x-request-id') ?? crypto.randomUUID());
  return applySecurityHeaders(response);
}

export const config = {
  matcher: ['/dashboard/:path*', '/portfolio/:path*', '/journal/:path*', '/analytics/:path*', '/settings/:path*', '/admin/:path*', '/onboarding', '/api/app-state/:path*']
};
