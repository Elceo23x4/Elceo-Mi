#!/usr/bin/env node

import { spawn } from 'node:child_process';

const steps = [
  ['node', ['--test', 'test/sec-h-release-governance.test.mjs']],
  ['node', ['scripts/sec-h-release-governance.mjs']],
  ['node', ['scripts/verify-sec-h-release-manifest.mjs']],
];

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: false, env: process.env });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (signal) return reject(new Error(`sec_h_step_signalled:${command}:${signal}`));
      if (code !== 0) return reject(new Error(`sec_h_step_failed:${command} ${args.join(' ')}:exit=${code}`));
      resolve();
    });
  });
}

for (const [command, args] of steps) await run(command, args);
console.log(JSON.stringify({ accepted: true, scenario: 'sec-h-governance-runner' }));
