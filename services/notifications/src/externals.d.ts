declare module 'pg' {
  export class Pool {
    constructor(config: Record<string, unknown>);
    connect(): Promise<{ query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>; release(): void }>;
  }
}
