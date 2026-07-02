import assert from 'node:assert/strict';
import { __setDbPoolFactoryForTests, closeDbPool, queryDb, withDbTransaction } from '../db/client';

export async function runDbClientLifecycleTests() {
  let created = 0; let ended = 0; let failInit = false; let failQuery = false; let releases = 0;
  const makePool = () => ({
    query: async () => { if (failQuery) throw new Error('query failed'); return { rows: [{ ok: true }] }; },
    connect: async () => ({ query: async (sql: string) => { if (sql === 'WORK') throw new Error('work failed'); return { rows: [] }; }, release: () => { releases += 1; } }),
    end: async () => { ended += 1; }
  });
  __setDbPoolFactoryForTests(() => { created += 1; if (failInit) throw new Error('init failed'); return makePool(); });
  await queryDb('SELECT 1'); await queryDb('SELECT 2'); assert.equal(created, 1, 'ordinary queries reuse one cached pool and test factory is cached');
  failQuery = true; await assert.rejects(() => queryDb('SELECT fail')); assert.equal(ended, 0, 'query failure does not close pool');
  failQuery = false; await queryDb('SELECT after_fail'); assert.equal(created, 1, 'query after failure reuses healthy pool');
  await closeDbPool(); assert.equal(ended, 1, 'explicit close ends once'); await closeDbPool(); assert.equal(ended, 1, 'repeated close does not end twice');
  await queryDb('SELECT new_pool'); assert.equal(created, 2, 'query after close creates new pool'); await closeDbPool();
  failInit = true; await assert.rejects(() => queryDb('SELECT init_fail')); failInit = false; await queryDb('SELECT init_retry'); assert.equal(created, 4, 'initialization failure clears cache and later init succeeds');
  await assert.rejects(() => withDbTransaction(async (tx) => { await tx.query('WORK'); })); assert.equal(releases, 1, 'transaction rollback path releases once');
  await closeDbPool(); __setDbPoolFactoryForTests(null);
}
