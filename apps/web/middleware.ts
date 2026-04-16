import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { evaluateRouteGuard } from './lib/auth/route-protection';

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret: runtimeEnv().AUTH_SECRET });

  const decision = evaluateRouteGuard({
    pathname,
    isAuthenticated: Boolean(token?.sub),
    role: String(token?.role ?? 'user')
  });

  if (!decision.allow && decision.redirectTo) {
    return NextResponse.redirect(new URL(decision.redirectTo, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/portfolio/:path*', '/journal/:path*', '/analytics/:path*', '/settings/:path*', '/admin/:path*', '/onboarding', '/api/app-state/:path*']
};
