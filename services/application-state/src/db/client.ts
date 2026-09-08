import { AsyncLocalStorage } from 'node:async_hooks';
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
let tenantPoolPromise: Promise<PoolLike> | null = null;
const tenantTransaction = new AsyncLocalStorage<DbTransactionClient>();

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
  if (current) {
    const pool = await current;
    if (typeof pool.end === 'function') await pool.end();
  }
  const tenant = tenantPoolPromise;
  tenantPoolPromise = null;
  if (tenant) await (await tenant).end?.();
}

export async function queryDb<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> {
  const connection = tenantTransaction.getStore() ?? await getPool();
  const result = await connection.query(sql, params);
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

/** Establish RLS context only from a server-verified user subject and only for this transaction. */
export function withTenantDbTransaction<T>(subject: { readonly subjectKind: 'user'; readonly subjectId: string }, callback: (transaction: DbTransactionClient) => Promise<T>): Promise<T> {
  if (!subject.subjectId) return Promise.reject(new Error('verified_subject_required'));
  return (async () => {
    const configured = runtimeEnv().TENANT_DATABASE_URL;
    if (!configured) throw new Error('tenant_database_url_required');
    if (!tenantPoolPromise) {
      tenantPoolPromise = import('pg').then(({ Pool }) => new Pool({ connectionString: configured }) as unknown as PoolLike);
    }
    const client = await (await tenantPoolPromise).connect();
    try {
      await client.query('BEGIN');
      const authority = await client.query(`SELECT r.rolsuper, r.rolbypassrls, EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = ANY($1::text[]) AND pg_get_userbyid(c.relowner)=current_user) AS owns_protected FROM pg_roles r WHERE r.rolname=current_user`, [['app_notification_targets','app_notification_subscriptions','app_notification_verifications','app_portfolio_watchlist_entries','app_portfolio_positions','app_portfolio_action_items','app_portfolio_snapshots','app_portfolio_revisions','app_journal_cases','app_journal_influence_snapshots','app_journal_case_revisions']]);
      if (!authority.rows[0] || authority.rows[0].rolsuper || authority.rows[0].rolbypassrls || authority.rows[0].owns_protected) throw new Error('tenant_database_role_unsafe');
      await client.query(`SELECT set_config('elceo.tenant_subject_id', $1, true)`, [subject.subjectId]);
      const result = await tenantTransaction.run(client, () => callback(client));
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally { client.release(); }
  })();
}
