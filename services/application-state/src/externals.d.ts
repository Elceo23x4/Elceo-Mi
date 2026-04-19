declare module 'pg' {
  export class Pool {
    constructor(config: Record<string, unknown>);
    connect(): Promise<{ query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>; release(): void }>;
  }
}

declare module 'next-auth' {
  const NextAuth: (config: Record<string, unknown>) => any;
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
