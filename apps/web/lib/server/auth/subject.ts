import 'server-only';

export type AuthenticatedSubject = {
  subjectKind: 'user';
  subjectId: string;
  userId: string;
};

let testSubjectResolver: null | (() => Promise<AuthenticatedSubject | null>) = null;
let testInternalToken: string | null = null;

export function setAuthTestOverrides(overrides: {
  subjectResolver?: (() => Promise<AuthenticatedSubject | null>) | null;
  internalToken?: string | null;
}): void {
  if ('subjectResolver' in overrides) testSubjectResolver = overrides.subjectResolver ?? null;
  if ('internalToken' in overrides) testInternalToken = overrides.internalToken ?? null;
}

export function clearAuthTestOverrides(): void {
  testSubjectResolver = null;
  testInternalToken = null;
}

async function resolveSession() {
  const authModule = await import('../../auth/config');
  return authModule.auth();
}

export async function getOptionalAuthenticatedSubject(): Promise<AuthenticatedSubject | null> {
  if (testSubjectResolver) return testSubjectResolver();
  const session = await resolveSession();
  const userId = session?.user?.id;
  if (!userId) return null;
  return { subjectKind: 'user', subjectId: userId, userId };
}

export async function requireAuthenticatedSubject(): Promise<AuthenticatedSubject> {
  const subject = await getOptionalAuthenticatedSubject();
  if (!subject) throw new Error('unauthorized');
  return subject;
}

export function requireInternalRouteAccess(request: Request): void {
  const token = request.headers.get('x-elceo-internal-token');
  const expected = testInternalToken ?? (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.ELCEO_INTERNAL_API_TOKEN;
  if (!expected || token !== expected) throw new Error('forbidden');
}
