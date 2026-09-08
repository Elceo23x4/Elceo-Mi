import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { evaluateRouteGuard } from './lib/auth/route-protection';
import { browserMutationException, verifyBrowserMutation } from './lib/server/security/browser-mutation';

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

function productionCsp(nonce: string): string {
  return `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://cdn.onesignal.com; worker-src 'self' blob: https://cdn.onesignal.com; style-src 'self' 'nonce-${nonce}'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://api.onesignal.com;`;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/api/') && !browserMutationException(pathname)) {
    const csrf = verifyBrowserMutation(request, runtimeEnv().APP_BASE_URL ?? runtimeEnv().NEXT_PUBLIC_APP_BASE_URL);
    if (!csrf.allowed) return applySecurityHeaders(NextResponse.json({ error: 'forbidden', reason: 'reason' in csrf ? csrf.reason : 'forbidden' }, { status: 403 }));
  }
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

  const nonce = btoa(crypto.randomUUID());
  const requestHeaders = new Headers(request.headers);
  if (runtimeEnv().NODE_ENV === 'production') requestHeaders.set('content-security-policy', productionCsp(nonce));
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (runtimeEnv().NODE_ENV === 'production') response.headers.set('content-security-policy', productionCsp(nonce));
  response.headers.set('x-request-id', request.headers.get('x-request-id') ?? crypto.randomUUID());
  return applySecurityHeaders(response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|pwa-icons).*)']
};
