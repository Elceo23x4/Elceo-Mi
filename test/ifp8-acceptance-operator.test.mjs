import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const invoke = (...args) => spawnSync(process.execPath, ['scripts/ifp8-acceptance.mjs', ...args], { cwd: new URL('../', import.meta.url), encoding: 'utf8', env: { ...process.env, DATABASE_URL: '' } });
test('IFP-8 operator rejects a missing operation', () => { const r = invoke(); assert.notEqual(r.status, 0); assert.match(r.stderr, /operation_required/); });
test('IFP-8 operator rejects unsupported operations before PostgreSQL', () => { const r = invoke('manufacture-acceptance'); assert.notEqual(r.status, 0); assert.match(r.stderr, /unsupported_operation/); });
test('IFP-8 operator rejects malformed option pairs', () => { const r = invoke('status', '--run-family'); assert.notEqual(r.status, 0); assert.match(r.stderr, /invalid_arguments/); });
