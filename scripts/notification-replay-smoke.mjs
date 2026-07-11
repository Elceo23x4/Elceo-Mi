#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const compile = spawnSync('npm', ['run', '-w', 'services/notifications', 'test', '--', '--smoke-compile'], { stdio: 'pipe', encoding: 'utf8' });
const combinedCompile = `${compile.stdout}${compile.stderr}`;
if (compile.status !== 0) {
  process.stderr.write(combinedCompile);
  process.exit(compile.status ?? 1);
}
if (!combinedCompile.includes('notifications runtime contract tests passed')) {
  console.error('notification replay smoke failed: actual notification runtime tests did not execute');
  process.exit(1);
}
const run = spawnSync('node', ['scripts/run-cjs-tests.mjs', 'services/notifications/dist-test', 'services/notifications/dist-test/services/notifications/src/tests/notification-replay-smoke-runner.js'], { stdio: 'inherit', encoding: 'utf8' });
process.exit(run.status ?? 1);
