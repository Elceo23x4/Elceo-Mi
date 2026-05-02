#!/usr/bin/env node

import { promises as fs } from 'node:fs';
import path from 'node:path';

const schemaDir = path.resolve('infra/db/schema');

function parsePrefix(filename) {
  const match = filename.match(/^(\d{4})_/);
  return match ? match[1] : null;
}

try {
  const entries = await fs.readdir(schemaDir, { withFileTypes: true });
  const sqlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (sqlFiles.length === 0) {
    console.error(`No SQL migrations found in ${schemaDir}`);
    process.exit(1);
  }

  const duplicateNames = [];
  const seen = new Set();
  for (const file of sqlFiles) {
    if (seen.has(file)) duplicateNames.push(file);
    seen.add(file);
  }

  if (duplicateNames.length > 0) {
    console.error(`Duplicate exact filenames detected: ${duplicateNames.join(', ')}`);
    process.exit(1);
  }

  const prefixMap = new Map();
  for (const file of sqlFiles) {
    const prefix = parsePrefix(file);
    if (!prefix) continue;
    const current = prefixMap.get(prefix) ?? [];
    current.push(file);
    prefixMap.set(prefix, current);
  }

  const duplicatePrefixes = [...prefixMap.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([prefix, files]) => ({ prefix, files }));

  console.log('Ordered migrations (lexicographic):');
  for (const file of sqlFiles) {
    console.log(` - ${file}`);
  }

  if (duplicatePrefixes.length > 0) {
    console.warn('Warning: duplicate numeric prefixes detected (ordering still lexicographic):');
    for (const item of duplicatePrefixes) {
      console.warn(` - ${item.prefix}: ${item.files.join(', ')}`);
    }
  }

  console.log('Migration file ordering check complete.');
  process.exit(0);
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown_error';
  console.error(`Failed to inspect migrations in ${schemaDir}: ${message}`);
  process.exit(1);
}
