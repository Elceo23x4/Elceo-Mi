#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { readMigrations, buildSchemaModel } from './migration-utils.mjs';

const roots = [
  'services/application-state/src/persistence',
  'services/reasoning/src/persistence',
  'services/reasoning/src/provider-sources',
  'services/ingestion/src/scheduler',
  'apps/web/lib/server',
  'apps/web/app/api',
];
const allow = new Set(['excluded', 'updated', 'set', 'active_gifts', 'active_restrictions', 'd', 'alert']);

let { migrations } = await readMigrations();
// Include static table fragments in the verification model without changing canonical migration order.
for (const frag of await files('infra/db/schema/tables')) {
  migrations.push({ filename: frag, sql: await fs.readFile(frag, 'utf8') });
}

const model = buildSchemaModel(migrations);
const errors = [...model.missingRefs];

async function files(dir) {
  try {
    const out = [];
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const candidate = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...await files(candidate));
      else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) out.push(candidate);
    }
    return out;
  } catch {
    return [];
  }
}

function readQuoted(source, start, quote) {
  let value = '';
  let index = start + 1;
  while (index < source.length) {
    const char = source[index];
    if (char === '\\') {
      const next = source[index + 1];
      if (next === undefined) return { value, nextIndex: index + 1 };
      if (next === 'n') value += '\n';
      else if (next === 'r') value += '\r';
      else if (next === 't') value += '\t';
      else if (next === '\n') {
        // JavaScript line continuation contributes no character to the literal value.
      } else value += next;
      index += 2;
      continue;
    }
    if (char === quote) return { value, nextIndex: index + 1 };
    value += char;
    index += 1;
  }
  return { value, nextIndex: index };
}

function skipJsComment(source, start) {
  if (source[start] === '/' && source[start + 1] === '/') {
    let index = start + 2;
    while (index < source.length && source[index] !== '\n') index += 1;
    return index;
  }
  if (source[start] === '/' && source[start + 1] === '*') {
    const end = source.indexOf('*/', start + 2);
    return end === -1 ? source.length : end + 2;
  }
  return start;
}

function skipTemplateExpression(source, start) {
  let depth = 1;
  let index = start;
  while (index < source.length && depth > 0) {
    const commentEnd = skipJsComment(source, index);
    if (commentEnd !== index) {
      index = commentEnd;
      continue;
    }
    const char = source[index];
    if (char === "'" || char === '"') {
      index = readQuoted(source, index, char).nextIndex;
      continue;
    }
    if (char === '`') {
      index = readTemplate(source, index).nextIndex;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    index += 1;
  }
  return index;
}

function readTemplate(source, start) {
  let value = '';
  let index = start + 1;
  while (index < source.length) {
    const char = source[index];
    if (char === '\\') {
      const next = source[index + 1];
      if (next === undefined) return { value, nextIndex: index + 1 };
      if (next === 'n') value += '\n';
      else if (next === 'r') value += '\r';
      else if (next === 't') value += '\t';
      else if (next === '\n') {
        // JavaScript line continuation contributes no character to the literal value.
      } else value += next;
      index += 2;
      continue;
    }
    if (char === '`') return { value, nextIndex: index + 1 };
    if (char === '$' && source[index + 1] === '{') {
      value += ' ? ';
      index = skipTemplateExpression(source, index + 2);
      continue;
    }
    value += char;
    index += 1;
  }
  return { value, nextIndex: index };
}

function extractStringLiterals(source) {
  const values = [];
  let index = 0;
  while (index < source.length) {
    const commentEnd = skipJsComment(source, index);
    if (commentEnd !== index) {
      index = commentEnd;
      continue;
    }
    const char = source[index];
    if (char === "'" || char === '"') {
      const parsed = readQuoted(source, index, char);
      values.push(parsed.value);
      index = parsed.nextIndex;
      continue;
    }
    if (char === '`') {
      const parsed = readTemplate(source, index);
      values.push(parsed.value);
      index = parsed.nextIndex;
      continue;
    }
    index += 1;
  }
  return values;
}

function stripLeadingSqlComments(value) {
  let sql = value.trimStart();
  for (;;) {
    if (sql.startsWith('--')) {
      const newline = sql.indexOf('\n');
      if (newline === -1) return '';
      sql = sql.slice(newline + 1).trimStart();
      continue;
    }
    if (sql.startsWith('/*')) {
      const end = sql.indexOf('*/', 2);
      if (end === -1) return '';
      sql = sql.slice(end + 2).trimStart();
      continue;
    }
    return sql;
  }
}

function isSqlCandidate(value) {
  const sql = stripLeadingSqlComments(value);
  if (!sql) return false;
  if (/^SELECT\b/i.test(sql)) return /\b(?:FROM|JOIN)\b/i.test(sql);
  if (/^INSERT\b/i.test(sql)) return /^INSERT\s+INTO\b/i.test(sql);
  if (/^UPDATE\b/i.test(sql)) return /^UPDATE\s+[a-zA-Z_]\w*\s+SET\b/i.test(sql);
  if (/^DELETE\b/i.test(sql)) return /^DELETE\s+FROM\b/i.test(sql);
  if (/^WITH\b/i.test(sql)) return /\b(?:SELECT|INSERT|UPDATE|DELETE)\b/i.test(sql);
  if (/^EXPLAIN\b/i.test(sql)) {
    const nested = sql.replace(/^EXPLAIN(?:\s+ANALYZE)?\s+/i, '');
    return nested !== sql && isSqlCandidate(nested);
  }
  return false;
}

function extractSqlLiterals(source) {
  return extractStringLiterals(source)
    .map(stripLeadingSqlComments)
    .filter(isSqlCandidate);
}

for (const root of roots) {
  for (const file of await files(root)) {
    const text = await fs.readFile(file, 'utf8');
    for (const sql of extractSqlLiterals(text)) {
      for (const match of sql.matchAll(/\b(?:FROM|JOIN|INTO|UPDATE)\s+([a-zA-Z_]\w*)/gi)) {
        const table = match[1];
        if (!allow.has(table.toLowerCase()) && !model.tables.has(table)) {
          errors.push(`${file}: references missing table ${table}`);
        }
      }
      for (const match of sql.matchAll(/INSERT\s+INTO\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)/gi)) {
        const table = match[1];
        const columns = match[2].match(/[a-zA-Z_]\w*/g) || [];
        const known = model.tables.get(table);
        if (known) {
          for (const column of columns) {
            if (!known.has(column)) errors.push(`${file}: ${table}.${column} missing from migration model`);
          }
        }
      }
    }
  }
}

if (errors.length) {
  console.error('DB reference verification failed:');
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}
console.log(`DB reference verification passed. tables=${model.tables.size}`);
