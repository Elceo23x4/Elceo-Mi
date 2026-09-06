import NextAuth, { type NextAuthConfig, type Session } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { ApplicationStateService, CredentialAuthenticationService, PostgresCredentialRepository, RedisLoginThrottle, RedisPasswordResetThrottle, getUserStateRepository } from '@elceo/application-state';
import { resolveCredentialsActivation } from './credentials-activation';

const appStateService = new ApplicationStateService(getUserStateRepository());

const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const isProduction = runtimeEnv.APP_ENV === 'production';
const credentialsActivation = resolveCredentialsActivation(runtimeEnv);
export const credentialsAuthEnabled = credentialsActivation.enabled;

if (isProduction && !runtimeEnv.AUTH_SECRET) throw new Error('AUTH_SECRET must be configured in production');

const credentialService = credentialsAuthEnabled && runtimeEnv.REDIS_URL
  ? new CredentialAuthenticationService(new PostgresCredentialRepository(), new RedisLoginThrottle(runtimeEnv.REDIS_URL), new RedisPasswordResetThrottle(runtimeEnv.REDIS_URL))
  : null;

type AuthenticatedProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
  planTier: string;
  onboardingCompletedAt: string | null;
};

const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: runtimeEnv.AUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 6
  },
  providers: [
    ...(runtimeEnv.AUTH_GOOGLE_CLIENT_ID && runtimeEnv.AUTH_GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: runtimeEnv.AUTH_GOOGLE_CLIENT_ID,
            clientSecret: runtimeEnv.AUTH_GOOGLE_CLIENT_SECRET
          })
        ]
      : []),
    ...(credentialService ? [Credentials({
      name: 'Email + Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials): Promise<AuthenticatedProfile | null> {
        const email = String(credentials?.email ?? '').trim();
        const password = String(credentials?.password ?? '');
        if (!email || !password || Array.from(password.normalize('NFC')).length > 256) return null;

        const profile = await credentialService.authenticate(email, password);
        if (!profile) return null;

        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          planTier: profile.planTier,
          onboardingCompletedAt: profile.onboardingCompletedAt
        };
      }
    })] : [])
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      await appStateService.ensureUserFromIdentity({ email: user.email, name: user.name ?? user.email, role: 'user' });
      return true;
    },
    async jwt({ token, user }) {
      const email = user?.email ?? token.email;
      if (!email) return token;
      const state = await appStateService.ensureUserFromIdentity({ email, name: user?.name ?? token.name ?? email, role: 'user' });
      token.sub = state.profile.id;
      token.role = state.profile.role;
      token.planTier = state.profile.planTier;
      token.onboardingCompletedAt = state.profile.onboardingCompletedAt;
      return token;
    },
    async session({ session, token }) {
      if (!session.user) return session;
      session.user.id = String(token.sub ?? '');
      session.user.role = (token.role as string | undefined) ?? 'user';
      session.user.planTier = (token.planTier as string | undefined) ?? 'free';
      session.user.onboardingCompletedAt = (token.onboardingCompletedAt as string | null | undefined) ?? null;
      return session;
    }
  },
  pages: { signIn: '/login' }
};

const nextAuthResult = NextAuth(authConfig);

export const handlers: typeof nextAuthResult.handlers = nextAuthResult.handlers;
export const signIn: typeof nextAuthResult.signIn = nextAuthResult.signIn;
export const signOut: typeof nextAuthResult.signOut = nextAuthResult.signOut;
export const auth: () => Promise<Session | null> = async () => {
  const resolveSession = nextAuthResult.auth as unknown as () => Promise<Session | null>;
  return resolveSession();
};
