import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [inputRootArg, entryArg] = process.argv.slice(2);

if (!inputRootArg || !entryArg) {
  console.error('Usage: node scripts/run-cjs-tests.mjs <input_root_dir> <entry_js_path>');
  process.exit(1);
}

const inputRoot = path.resolve(inputRootArg);
const outputRoot = `${inputRoot}-cjs`;

const aliasTargets = {
  '@elceo/config': 'packages/config/src/index.cjs',
  '@elceo/types': 'packages/types/src/index.cjs',
  '@elceo/domain': 'packages/domain/src/index.cjs',
  '@elceo/schemas': 'tests/stubs/schemas.cjs',
  '@elceo/providers': 'packages/providers/src/index.cjs',
  '@elceo/application-state': 'services/application-state/src/index.cjs',
  '@elceo/analytics': 'services/analytics/src/index.cjs',
  '@elceo/billing': 'services/billing/src/index.cjs',
  '@/lib/server/api': 'lib/server/api/index.cjs',
  '@/lib/server/auth': 'lib/server/auth/index.cjs',
  '@/lib/server/composition': 'tests/stubs/composition.cjs',
};

async function walk(dir) {
  const items = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

function rewriteRequires(content, targetFile) {
  let updated = content.replace(/require\((['"])(\.{1,2}\/[^'"\)]+)\1\)/g, (_match, quote, spec) => {

    let next = spec;
    if (next.endsWith('.js')) next = next.slice(0, -3) + '.cjs';
    else {
      const ext = path.extname(next);
      if (!ext || ext === '.schema') next = `${next}.cjs`;
    }
    return `require(${quote}${next}${quote})`;
  });

  updated = updated.replace(/require\((['"])(@elceo\/[a-z\-]+|@\/lib\/server\/(?:api|auth|composition))\1\)/g, (_match, quote, alias) => {
    const relTarget = aliasTargets[alias];
    if (!relTarget) return _match;
    const absolute = path.join(outputRoot, relTarget);
    let relative = path.relative(path.dirname(targetFile), absolute).replace(/\\/g, '/');
    if (!relative.startsWith('.')) relative = `./${relative}`;
    return `require(${quote}${relative}${quote})`;
  });

  updated = updated.replace(/require\((['"])server-only\1\);?/g, '');
  return updated;
}

await fs.rm(outputRoot, { recursive: true, force: true });
const allFiles = await walk(inputRoot);

for (const source of allFiles) {
  const relative = path.relative(inputRoot, source);
  const target = path.join(outputRoot, relative.replace(/\.js$/g, '.cjs'));
  await fs.mkdir(path.dirname(target), { recursive: true });

  if (source.endsWith('.js')) {
    const content = await fs.readFile(source, 'utf8');
    await fs.writeFile(target, rewriteRequires(content, target), 'utf8');
  } else {
    await fs.copyFile(source, target);
  }
}

const relativeEntry = path.relative(inputRoot, path.resolve(entryArg));
const cjsEntry = path.join(outputRoot, relativeEntry.replace(/\.js$/g, '.cjs'));
await import(pathToFileURL(cjsEntry).href);
