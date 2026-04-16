import { Pool } from 'pg';

let pool: Pool | null = null;

function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

export function getDbPool(): Pool {
  if (pool) return pool;

  const env = runtimeEnv();
  const connectionString = env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required for application-state DB access');
  }

  pool = new Pool({ connectionString });
  return pool;
}

export async function queryDb<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = await getDbPool().connect();
  try {
    const result = await client.query<T>(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}
