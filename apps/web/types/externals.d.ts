declare module 'next-auth' {
  const NextAuth: (config: Record<string, unknown>) => {
    handlers: { GET: (request: Request) => Promise<Response>; POST: (request: Request) => Promise<Response> };
    auth: () => Promise<any>;
    signIn: (...args: unknown[]) => Promise<unknown>;
    signOut: (...args: unknown[]) => Promise<unknown>;
  };
  export default NextAuth;
}

declare module 'next-auth/providers/google' {
  const Google: (config: Record<string, unknown>) => unknown;
  export default Google;
}

declare module 'next-auth/providers/credentials' {
  const Credentials: (config: Record<string, unknown>) => unknown;
  export default Credentials;
}

declare module 'next-auth/react' {
  export function signIn(provider?: string, options?: Record<string, unknown>): Promise<{ error?: string; url?: string | null } | undefined>;
}

declare module 'next-auth/jwt' {
  export function getToken(input: { req: unknown; secret?: string }): Promise<{ sub?: string; role?: string } | null>;
}
