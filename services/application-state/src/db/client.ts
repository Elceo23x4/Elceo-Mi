function runtimeEnv(): Record<string, string | undefined> {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
}

type QueryResultRow = Record<string, unknown>;

export type DbTransactionClient = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[] }>;
};

type PoolClientLike = DbTransactionClient & { release: () => void };

export type DbPoolLike = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: QueryResultRow[] }>;
  connect: () => Promise<PoolClientLike>;
  end?: () => Promise<void> | void;
};

type PoolLike = DbPoolLike;

let testPoolFactory: (() => Promise<PoolLike> | PoolLike) | null = null;
let poolPromise: Promise<PoolLike> | null = null;

export function __setDbPoolFactoryForTests(factory: (() => Promise<PoolLike> | PoolLike) | null): void {
  testPoolFactory = factory;
  poolPromise = null;
}

async function initializePool(): Promise<PoolLike> {
  if (testPoolFactory) return testPoolFactory();
  const module = await import('pg');
  const PoolCtor = module.Pool;
  return new PoolCtor({ connectionString: runtimeEnv().DATABASE_URL }) as unknown as PoolLike;
}

export async function getDbPoolForTests(): Promise<PoolLike> { return getPool(); }

async function getPool(): Promise<PoolLike> {
  if (!poolPromise) {
    poolPromise = initializePool().catch((error) => {
      poolPromise = null;
      throw error;
    });
  }
  return poolPromise;
}

export async function closeDbPool(): Promise<void> {
  const current = poolPromise;
  poolPromise = null;
  if (!current) return;
  const pool = await current;
  if (typeof pool.end === 'function') await pool.end();
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
  let result: T | undefined;
  let releaseError: unknown;
  const guarded: DbTransactionClient = {
    query(sql, params) {
      if (released) return Promise.reject(new Error('transaction_client_released'));
      return client.query(sql, params);
    }
  };
  try {
    await guarded.query('BEGIN');
    result = await callback(guarded);
    await guarded.query('COMMIT');
  } catch (error) {
    operationError = error;
    try { if (!released) await guarded.query('ROLLBACK'); } catch {
      // Preserve the original operation failure; rollback cleanup is best-effort.
    }
  } finally {
    released = true;
    try { client.release(); } catch (error) { releaseError = error; }
  }
  if (operationError !== undefined) throw operationError;
  if (releaseError !== undefined) throw releaseError;
  return result as T;
}
