import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { ApplicationStateService, getUserStateRepository } from '@elceo/application-state';
import { logEvent } from '@elceo/config';

const appStateService = new ApplicationStateService(getUserStateRepository());

const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const isProduction = runtimeEnv.APP_ENV === 'production';

if (isProduction && !runtimeEnv.AUTH_SECRET) {
  throw new Error('AUTH_SECRET must be configured in production');
}

export const { handlers, auth, signIn, signOut } = NextAuth({
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
    Credentials({
      name: 'Email + Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials: any) {
        const email = String(credentials?.email ?? '').trim();
        const password = String(credentials?.password ?? '');
        if (!email || !password || password.length > 256) return null;

        const profile = await getUserStateRepository().verifyPasswordCredentials(email, password);
        if (!profile) {
          logEvent('auth.credentials', 'warn', 'credential authorization failed', { email });
          return null;
        }

        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          planTier: profile.planTier,
          onboardingCompletedAt: profile.onboardingCompletedAt
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user }: any) {
      if (!user.email) return false;

      await appStateService.ensureUserFromIdentity({
        email: user.email,
        name: user.name ?? user.email,
        role: 'user'
      });

      return true;
    },
    async jwt({ token, user }: any) {
      const email = user?.email ?? token.email;
      if (!email) return token;

      const state = await appStateService.ensureUserFromIdentity({
        email,
        name: user?.name ?? token.name ?? email,
        role: 'user'
      });

      token.sub = state.profile.id;
      token.role = state.profile.role;
      token.planTier = state.profile.planTier;
      token.onboardingCompletedAt = state.profile.onboardingCompletedAt;

      return token;
    },
    async session({ session, token }: any) {
      if (!session.user) return session;

      session.user.id = String(token.sub ?? '');
      session.user.role = (token.role as string | undefined) ?? 'user';
      session.user.planTier = (token.planTier as string | undefined) ?? 'free';
      session.user.onboardingCompletedAt = (token.onboardingCompletedAt as string | null | undefined) ?? null;

      return session;
    }
  },
  pages: {
    signIn: '/login'
  }
});
