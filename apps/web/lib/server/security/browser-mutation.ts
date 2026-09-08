import 'server-only';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type BrowserMutationDecision = { allowed: true } | { allowed: false; reason: string };

function parsedOrigin(value: string | null): string | null {
  if (!value) return null;
  try { return new URL(value).origin; } catch { return null; }
}

export function verifyBrowserMutation(request: Pick<Request, 'method' | 'headers'>, trustedApplicationUrl: string | undefined): BrowserMutationDecision {
  if (!UNSAFE_METHODS.has(request.method.toUpperCase())) return { allowed: true };
  const trusted = parsedOrigin(trustedApplicationUrl ?? null);
  if (!trusted) return { allowed: false, reason: 'trusted_origin_not_configured' };
  const fetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (fetchSite === 'cross-site') return { allowed: false, reason: 'cross_site' };
  const origin = parsedOrigin(request.headers.get('origin'));
  if (origin) return origin === trusted ? { allowed: true } : { allowed: false, reason: 'origin_mismatch' };
  // same-origin Fetch Metadata is a browser-generated, trustworthy source signal.
  if (fetchSite === 'same-origin') return { allowed: true };
  const referer = parsedOrigin(request.headers.get('referer'));
  if (referer) return referer === trusted ? { allowed: true } : { allowed: false, reason: 'referer_mismatch' };
  return { allowed: false, reason: 'origin_evidence_missing' };
}

/** Explicit non-cookie mutation classes; all other unsafe canonical APIs are guarded. */
export function browserMutationException(pathname: string): string | null {
  if (pathname.startsWith('/api/auth/')) return 'nextauth_owned_csrf';
  if (/^\/api\/(billing\/webhook|notifications\/providers\/[^/]+\/webhook)(\/|$)/.test(pathname)) return 'cryptographically_verified_provider_webhook';
  if (/^\/api\/(internal|ops)\//.test(pathname)) return 'internal_token_or_machine_authority';
  if (pathname.startsWith('/api/admin/')) return 'internal_token_and_admin_authority';
  if (pathname === '/api/notifications/delivery/dispatch') return 'internal_token_authority';
  if (pathname.startsWith('/api/auth/password-reset/')) return 'unauthenticated_one_time_token_flow';
  return null;
}
