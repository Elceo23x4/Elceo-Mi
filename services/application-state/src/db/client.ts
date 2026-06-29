function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

type QueryResultRow = Record<string, unknown>;

export type DbTransactionClient = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[] }>;
};

type PoolClientLike = DbTransactionClient & { release: () => void };

type PoolLike = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[] }>;
  connect: () => Promise<PoolClientLike>;
};

let poolPromise: Promise<PoolLike> | null = null;

async function getPool(): Promise<PoolLike> {
  if (!poolPromise) {
    poolPromise = (async () => {
      const module = await import('pg');
      const PoolCtor = module.Pool;
      return new PoolCtor({
        connectionString: runtimeEnv().DATABASE_URL
      }) as unknown as PoolLike;
    })();
  }
  return poolPromise;
}

export async function queryDb<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pool = await getPool();
  const result = await pool.query(sql, params);
  return result.rows as T[];
}


export async function withDbTransaction<T>(callback: (transaction: DbTransactionClient) => Promise<T>): Promise<T> {
  const pool = await getPool();
  const client = await pool.connect();
  let released = false;
  let operationError: unknown;
  const guarded: DbTransactionClient = {
    query(sql, params) {
      if (released) return Promise.reject(new Error('transaction_client_released'));
      return client.query(sql, params);
    }
  };
  try {
    await guarded.query('BEGIN');
    const result = await callback(guarded);
    await guarded.query('COMMIT');
    return result;
  } catch (error) {
    operationError = error;
    try {
      if (!released) await guarded.query('ROLLBACK');
    } catch {
      // Preserve the original operation failure; cleanup failures are intentionally secondary.
    }
    throw operationError;
  } finally {
    released = true;
    client.release();
  }
}
