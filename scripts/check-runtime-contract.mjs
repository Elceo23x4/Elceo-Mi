#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').trim();
const fail = (message) => {
  console.error(`Runtime contract failed: ${message}`);
  process.exit(1);
};

const canonical = read('.node-version');
if (!/^24\.\d+\.\d+$/.test(canonical)) fail(`.node-version must pin an exact Node 24 patch, got ${canonical}`);
if (read('.nvmrc') !== canonical) fail('.nvmrc and .node-version differ');

const root = JSON.parse(read('package.json'));
const web = JSON.parse(read('apps/web/package.json'));
const workflow = read('.github/workflows/ci.yml');
const expectedNpm = root.packageManager?.replace(/^npm@/, '');

if (root.engines?.node !== '24.x') fail(`root engines.node must be exactly 24.x, got ${root.engines?.node}`);
if (web.engines?.node !== root.engines.node) fail('web build Node engine differs from the root contract');
if (root.engines?.npm !== expectedNpm || web.engines?.npm !== expectedNpm) fail('npm engine contract is not aligned');
if (root.packageManager !== 'npm@10.8.2') fail('packageManager must be npm@10.8.2');
if (!workflow.includes(`node-version: '${canonical}'`)) fail('CI does not select the canonical exact Node patch');
if (!workflow.includes(`npm install --global npm@${expectedNpm}`)) fail('CI does not explicitly activate the pinned npm version');
if (process.version !== `v${canonical}`) fail(`actual Node is ${process.version}; expected v${canonical}`);

const actualNpm = execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim();
if (actualNpm !== expectedNpm) fail(`actual npm is ${actualNpm}; expected ${expectedNpm}`);

console.log(`Runtime contract passed: Node ${canonical}, npm ${expectedNpm}, root/web engines ${root.engines.node}.`);
