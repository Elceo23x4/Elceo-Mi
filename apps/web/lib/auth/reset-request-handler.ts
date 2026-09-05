import { NextResponse } from 'next/server';
import type { CredentialAuthenticationService, PasswordResetDelivery } from '@elceo/application-state';

const RESPONSE = { accepted: true } as const;
export type ResetRequestRuntime = { service: CredentialAuthenticationService | null; baseUrl: URL | null; delivery: PasswordResetDelivery };
export async function handlePasswordResetRequest(request: Request, schedule: (task: () => Promise<void>) => void, runtime: ResetRequestRuntime) {
  let email = '';
  try { const body = await request.json() as { email?: unknown }; email = typeof body.email === 'string' ? body.email.trim() : ''; } catch { /* Generic response. */ }
  if (runtime.service && runtime.baseUrl && email) {
    schedule(async () => { await runtime.service!.requestReset(email, runtime.baseUrl!, runtime.delivery); });
  }
  return NextResponse.json(RESPONSE, { status: 202 });
}
