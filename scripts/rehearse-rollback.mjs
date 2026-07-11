#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { env, fail, pass } from './security-rc-j-utils.mjs';

const target = env('ROLLBACK_DEPLOYMENT_TARGET') || env('DEPLOYMENT_TARGET_ENV');
const smokeUrl = env('POST_ROLLBACK_SMOKE_URL');
const smokeCommand = env('ROLLBACK_SMOKE_COMMAND');
const allowProduction = env('ALLOW_PRODUCTION_ROLLBACK_REHEARSAL') === 'true';

if (!target) fail('rollback execution not completed: deployment target unavailable');
if (!['staging', 'production'].includes(target)) fail('rollback rehearsal failed: rollback target must be explicit staging or production');
if (target === 'production' && !allowProduction) fail('rollback rehearsal failed: production target requires ALLOW_PRODUCTION_ROLLBACK_REHEARSAL=true');
if (!smokeUrl && !smokeCommand) fail('rollback execution not completed: post-rollback smoke unavailable');

async function runSmokeUrl(url) {
  let response;
  try {
    response = await fetch(url, { method: 'GET' });
  } catch {
    fail('rollback rehearsal failed: post-rollback smoke URL unavailable');
  }
  if (response.status >= 500) fail('rollback rehearsal failed: post-rollback smoke returned 5xx');
  return { kind: 'url', status: response.status };
}

function parseSmokeCommand(commandText) {
  try {
    const parsed = JSON.parse(commandText);
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((part) => typeof part !== 'string' || part.length === 0)) {
      fail('rollback rehearsal failed: ROLLBACK_SMOKE_COMMAND must be a JSON string array');
    }
    return parsed;
  } catch {
    fail('rollback rehearsal failed: ROLLBACK_SMOKE_COMMAND must be a JSON string array');
  }
}

function runSmokeCommand(commandText) {
  const [command, ...args] = parseSmokeCommand(commandText);
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    child.on('error', () => fail('rollback rehearsal failed: post-rollback smoke command unavailable'));
    child.on('exit', (code) => {
      if (code !== 0) fail('rollback rehearsal failed: post-rollback smoke command failed');
      resolve({ kind: 'command', status: 0 });
    });
  });
}

const proof = smokeUrl ? await runSmokeUrl(smokeUrl) : await runSmokeCommand(smokeCommand);
pass('rollback_rehearsal_passed', { target, smoke: proof.kind, status: proof.status });
