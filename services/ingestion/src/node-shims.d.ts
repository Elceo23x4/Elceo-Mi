declare module 'node:fs/promises' {
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function readFile(path: string, encoding: string): Promise<string>;
  export function writeFile(path: string, data: string, encoding: string): Promise<void>;
}

declare module 'node:path' {
  export function dirname(path: string): string;
}

declare module 'kafkajs' {
  export class Kafka {
    constructor(config: Record<string, unknown>);
    producer(): any;
    consumer(config: Record<string, unknown>): any;
  }
}

declare module 'pg' {
  export class Pool {
    constructor(config?: Record<string, unknown>);
    query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  }
}
