import { readFileSync } from 'node:fs';

const doc = readFileSync('docs/intelligence-feature-program.md', 'utf8');
const failures = [];
const fail = (m) => failures.push(m);

const phases = [...doc.matchAll(/^### (IFP-(\d+)) — (.+)$/gm)].map((m) => ({ id: m[1], n: Number(m[2]), name: m[3], index: m.index }));
if (phases.length !== 8) fail(`expected exactly 8 canonical phases, found ${phases.length}`);
phases.forEach((p, i) => {
  if (p.n !== i + 1) fail(`phase order mismatch at ${p.id}`);
  if (p.id !== `IFP-${i + 1}`) fail(`phase id mismatch: ${p.id}`);
});
if (new Set(phases.map((p) => p.id)).size !== phases.length) fail('phase IDs are not unique');

const required = [
  'Phase ID:', 'Canonical phase name:', 'Exact objective:', 'Problem being closed:', 'Source requirements:',
  'Existing modules reused:', 'Likely permitted files:', 'Prohibited scope:', 'Dependencies:', 'Implementation outputs:',
  'Tests and evaluation evidence:', 'Merge blockers:', 'External data/environment requirements:', 'Truthful completion language:', 'Stop condition:'
];
phases.forEach((p, i) => {
  const next = phases[i + 1]?.index ?? doc.indexOf('\n## Dependency graph');
  const body = doc.slice(p.index, next);
  for (const label of required) if (!body.includes(`- ${label}`)) fail(`${p.id} missing ${label}`);
});

const requiredPhrases = [
  'RC-I2-CERT — Credentialed Payment Provider Sandbox Certification',
  'RC-J-ENV — External Infrastructure and Disaster-Recovery Certification',
  'RC-K begins only after all eight IFP phases are closed',
  'RC-K final full-repository closure',
  'Affiliate-1 through Affiliate-9 are not IFP phases',
  'Referral commission, coupons, affiliate wallets and withdrawals are not intelligence calibration',
  'Affiliate work must not be introduced in an IFP branch',
  '25 of 33 deterministic golden scenarios currently produce confidence 0',
  'mandatory empirical diagnosis',
  'Live provider activation remains behind the Provider API Gate',
  'No IFP phase may claim production validation from fixtures alone'
];
for (const phrase of requiredPhrases) if (!doc.includes(phrase)) fail(`missing required dependency/metadata phrase: ${phrase}`);

if (/^### .*C6-R9H|^### .*C6-R10|Phase ID: C6-R9H|Phase ID: C6-R10/m.test(doc)) fail('prohibited C6-R9H or C6-R10 introduced');
if (/^### Affiliate-\d+/m.test(doc) || /^### IFP-\d+.*Affiliate/im.test(doc)) fail('affiliate phase represented as IFP phase');
if (/\b(deferred|postponed)\b/i.test(doc)) fail('prohibited deferred/postponed terminology appears in IFP doc');

if (failures.length) {
  console.error('IFP documentation consistency check failed:');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log('IFP documentation consistency check passed.');
