import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const invoke = (...args) => spawnSync(process.execPath, ['scripts/ifp8-acceptance.mjs', ...args], { cwd: new URL('../', import.meta.url), encoding: 'utf8', env: { ...process.env, DATABASE_URL: '' } });
const rejects = (args, reason) => { const result = invoke(...args); assert.notEqual(result.status, 0); assert.match(result.stderr, reason); };
test('IFP-8 operator rejects a missing operation', () => rejects([], /operation_required/));
test('IFP-8 operator rejects unsupported operations before PostgreSQL', () => rejects(['manufacture-acceptance'], /unsupported_operation/));
test('IFP-8 operator rejects malformed option pairs', () => rejects(['status', '--run-family'], /invalid_arguments/));
test('IFP-8 operator rejects duplicate arguments', () => rejects(['status', '--run-family', 'one', '--run-family', 'two'], /duplicate_argument/));
test('IFP-8 operator requires DATABASE_URL', () => rejects(['status', '--run-family', 'one'], /DATABASE_URL_required/));
for (const operation of ['import', 'status', 'preflight', 'open-holdout', 'evaluate', 'export-evidence'])
  test(`${operation} requires its identity option`, () => rejects([operation], /required_option_missing/));
test('open-holdout requires confirmation', () => rejects(['open-holdout', '--run-family', 'one'], /required_option_missing/));
