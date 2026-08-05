#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const status = execFileSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], { encoding: 'utf8' });
if (status) {
  console.error(`Unexpected working-tree mutation:\n${status}`);
  process.exit(1);
}
const committed = execFileSync('git', ['show', 'HEAD:package-lock.json']);
const working = readFileSync('package-lock.json');
const hash = (input) => createHash('sha256').update(input).digest('hex');
if (hash(committed) !== hash(working)) {
  console.error('package-lock.json differs byte-for-byte from HEAD');
  process.exit(1);
}
console.log(`Working tree clean; package-lock.json SHA-256 ${hash(working)} matches HEAD.`);
