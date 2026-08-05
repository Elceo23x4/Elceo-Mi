#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import semver from 'semver';

const manifest = JSON.parse(readFileSync(new URL('./dependency-compatibility-exceptions.json', import.meta.url)));
function registry(name) {
  const url = `https://registry.npmjs.org/${name}`;
  try { return JSON.parse(execFileSync('curl', ['--fail', '--silent', '--show-error', '--max-time', '15', url], { encoding: 'utf8', timeout: 17_000, maxBuffer: 100 * 1024 * 1024 })); }
  catch (error) { throw new Error(`authoritative npm registry query failed for ${url}: ${error.code ?? error.message}`); }
}
try {
  const stable = (version) => semver.valid(version) && !semver.prerelease(version);
  const [nextMeta, sharpMeta, authMeta] = ['next', 'sharp', 'next-auth'].map(registry);
  const nextVersions = Object.keys(nextMeta.versions).filter(stable).sort(semver.rcompare);
  const sharpVersions = Object.keys(sharpMeta.versions).filter(stable).filter((version) => semver.gte(version, '0.35.0')).sort(semver.rcompare);
  const authRange = authMeta.versions['5.0.0-beta.32'].peerDependencies.next;
  const evaluated = [];
  for (const version of nextVersions.filter((version) => semver.gte(version, '15.5.22')).slice(0, 25)) {
    const sharpRange = nextMeta.versions[version].optionalDependencies?.sharp;
    evaluated.push({ next: version, sharpRange, authCompatible: semver.satisfies(version, authRange), safeSharp: sharpVersions.find((item) => sharpRange && semver.satisfies(item, sharpRange)) ?? null });
  }
  const candidates = evaluated.filter((item) => item.authCompatible && item.safeSharp);
  console.log(JSON.stringify({ registry: 'https://registry.npmjs.org', auth: 'next-auth@5.0.0-beta.32', authRange, newestSafeSharp: sharpVersions[0], evaluated }, null, 2));
  if (candidates.length && manifest.exceptions.length) throw new Error(`active exception must be removed: stable next@${candidates[0].next} declares ${candidates[0].sharpRange} and admits sharp@${candidates[0].safeSharp}`);
  if (!candidates.length && !manifest.exceptions.length) throw new Error('supported graph disappeared but no active exception is governed');
  console.log(`Stable upstream graph confirmed: next@${candidates[0].next} declares ${candidates[0].sharpRange}, admits sharp@${candidates[0].safeSharp}, and Auth.js range ${authRange}; active exceptions=${manifest.exceptions.length}.`);
} catch (error) { console.error(`Upstream Sharp exception check failed: ${error.message}`); process.exit(1); }
