import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/dashboard', '/portfolio', '/journal', '/analytics', '/settings', '/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const onboardingComplete = request.cookies.get('elceo_onboarding')?.value === 'complete';

  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtected && !onboardingComplete) {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  if (pathname.startsWith('/onboarding') && onboardingComplete) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/portfolio/:path*', '/journal/:path*', '/analytics/:path*', '/settings/:path*', '/admin/:path*', '/onboarding']
};
