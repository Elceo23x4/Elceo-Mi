import NextAuth, { type Session } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import type { JWT } from 'next-auth/jwt';
import { ApplicationStateService, getUserStateRepository } from '@elceo/application-state';
import { logEvent } from '@elceo/config';

type AppRole = 'user' | 'super_admin' | 'analyst_admin' | 'support_admin';
type AppPlanTier = 'free' | 'premium';

type AppAuthUser = {
  id: string;
  email: string;
  name?: string | null;
  role: AppRole;
  planTier: AppPlanTier;
  onboardingCompletedAt: string | null;
};

type AppToken = JWT & {
  role?: AppRole;
  planTier?: AppPlanTier;
  onboardingCompletedAt?: string | null;
};

type AppSessionUser = NonNullable<Session['user']> & {
  id: string;
  role: AppRole;
  planTier: AppPlanTier;
  onboardingCompletedAt: string | null;
};

type NextAuthConfig = NonNullable<Parameters<typeof NextAuth>[0]>;

const appStateService = new ApplicationStateService(getUserStateRepository());

const runtimeEnv = process.env;
const isProduction = runtimeEnv.APP_ENV === 'production';

if (isProduction && !runtimeEnv.AUTH_SECRET) {
  throw new Error('AUTH_SECRET must be configured in production');
}

const authConfig = {
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
      async authorize(credentials): Promise<AppAuthUser | null> {
        const email = String(credentials?.email ?? '').trim();
        const password = String(credentials?.password ?? '');

        if (!email || !password || password.length > 256) {
          return null;
        }

        const profile = await getUserStateRepository().verifyPasswordCredentials(email, password);

        if (!profile) {
          logEvent('auth.credentials', 'warn', 'credential authorization failed', { email });
          return null;
        }

        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role as AppRole,
          planTier: profile.planTier as AppPlanTier,
          onboardingCompletedAt: profile.onboardingCompletedAt
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) {
        return false;
      }

      await appStateService.ensureUserFromIdentity({
        email: user.email,
        name: user.name ?? user.email,
        role: 'user'
      });

      return true;
    },

    async jwt({ token, user }) {
      const appToken = token as AppToken;
      const authUser = user as AppAuthUser | undefined;
      const email = authUser?.email ?? appToken.email;

      if (!email) {
        return appToken;
      }

      const state = await appStateService.ensureUserFromIdentity({
        email,
        name: authUser?.name ?? appToken.name ?? email,
        role: 'user'
      });

      appToken.sub = state.profile.id;
      appToken.role = state.profile.role as AppRole;
      appToken.planTier = state.profile.planTier as AppPlanTier;
      appToken.onboardingCompletedAt = state.profile.onboardingCompletedAt;

      return appToken;
    },

    async session({ session, token }) {
      if (!session.user) {
        return session;
      }

      const appToken = token as AppToken;
      const sessionUser = session.user as AppSessionUser;

      sessionUser.id = String(appToken.sub ?? '');
      sessionUser.role = appToken.role ?? 'user';
      sessionUser.planTier = appToken.planTier ?? 'free';
      sessionUser.onboardingCompletedAt = appToken.onboardingCompletedAt ?? null;

      return session;
    }
  },
  pages: {
    signIn: '/login'
  }
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);