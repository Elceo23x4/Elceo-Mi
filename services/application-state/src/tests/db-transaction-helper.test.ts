import assert from 'node:assert/strict';
import { __setDbPoolFactoryForTests, withDbTransaction, type DbTransactionClient } from '../db/client';

type Op = string;
const makePool = (failOn: string | null = null, releaseThrows = false) => {
  const ops: Op[] = [];
  let released = 0;
  const client = {
    async query(sql: string) { ops.push(sql); if (failOn === sql) throw new Error(`${sql}_failed`); return { rows: [] }; },
    release() { released += 1; ops.push('release'); if (releaseThrows) throw new Error('release_failed'); }
  };
  const pool = { async query() { ops.push('pool_query'); return { rows: [] }; }, async connect() { ops.push('connect'); return client; } };
  return { pool, ops, released: () => released };
};

export async function runDbTransactionHelperTests(): Promise<void> {
  let captured: DbTransactionClient | null = null;
  const ok = makePool(); __setDbPoolFactoryForTests(() => ok.pool);
  await withDbTransaction(async (tx) => { captured = tx; await tx.query('SELECT inside'); });
  assert.deepEqual(ok.ops, ['connect', 'BEGIN', 'SELECT inside', 'COMMIT', 'release']);
  assert.equal(ok.released(), 1);
  await assert.rejects(() => captured!.query('SELECT after'), /transaction_client_released/);
  assert.equal(ok.ops.includes('pool_query'), false);

  const callbackFail = makePool(); __setDbPoolFactoryForTests(() => callbackFail.pool);
  await assert.rejects(() => withDbTransaction(async () => { throw new Error('callback_failed'); }), /callback_failed/);
  assert.deepEqual(callbackFail.ops, ['connect', 'BEGIN', 'ROLLBACK', 'release']);

  const commitFail = makePool('COMMIT'); __setDbPoolFactoryForTests(() => commitFail.pool);
  await assert.rejects(() => withDbTransaction(async () => undefined), /COMMIT_failed/);
  assert.deepEqual(commitFail.ops, ['connect', 'BEGIN', 'COMMIT', 'ROLLBACK', 'release']);

  const beginFail = makePool('BEGIN'); __setDbPoolFactoryForTests(() => beginFail.pool);
  await assert.rejects(() => withDbTransaction(async () => undefined), /BEGIN_failed/);
  assert.deepEqual(beginFail.ops, ['connect', 'BEGIN', 'ROLLBACK', 'release']);

  const releaseFail = makePool(null, true); __setDbPoolFactoryForTests(() => releaseFail.pool);
  await assert.rejects(() => withDbTransaction(async () => { throw new Error('original_failed'); }), /original_failed/);
  assert.equal(releaseFail.released(), 1);
  __setDbPoolFactoryForTests(null);
}
