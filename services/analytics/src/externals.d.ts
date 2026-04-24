declare module 'pg' {
  export class Pool {
    constructor(config: Record<string, unknown>);
    query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  }
}
