import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const doc = read('docs/intelligence-feature-program.md');
const ci = read('.github/workflows/ci.yml');
const releaseGate = read('scripts/release-gate.mjs');
const packageJson = JSON.parse(read('package.json'));
const alignmentDocs = [
  'docs/backend-open-loop-register.md',
  'docs/final-production-status-report.md',
  'docs/production-readiness-checklist.md',
  'docs/post-r9-cleanup-execution-plan.md',
];
const failures = [];
const fail = (message) => failures.push(message);

if (packageJson.scripts?.['check:ifp'] !== 'node scripts/check-intelligence-feature-program.mjs') fail('package.json check:ifp script is missing or changed');
if (!/name:\s*Check Intelligence Feature Program contract[\s\S]*?run:\s*npm run check:ifp/.test(ci)) fail('GitHub CI does not run check:ifp with the expected step name');
if (!/label:\s*['"]npm run check:ifp['"][\s\S]*?args:\s*\[[^\]]*['"]run['"][^\]]*['"]check:ifp['"][^\]]*\]/.test(releaseGate)) fail('release gate does not include npm run check:ifp');

const phases = [...doc.matchAll(/^### (IFP-(\d+)) — (.+)$/gm)].map((match) => ({ id: match[1], n: Number(match[2]), name: match[3], index: match.index }));
if (phases.length !== 8) fail(`expected exactly 8 canonical phases, found ${phases.length}`);
phases.forEach((phase, index) => {
  if (phase.n !== index + 1) fail(`phase order mismatch at ${phase.id}`);
  if (phase.id !== `IFP-${index + 1}`) fail(`phase id mismatch: ${phase.id}`);
});
if (new Set(phases.map((phase) => phase.id)).size !== phases.length) fail('phase IDs are not unique');

const required = [
  'Phase ID:', 'Canonical phase name:', 'Exact objective:', 'Problem being closed:', 'Source requirements:',
  'Existing modules reused:', 'Likely permitted files:', 'Prohibited scope:', 'Dependencies:', 'Implementation outputs:',
  'Tests and evaluation evidence:', 'Merge blockers:', 'External data/environment requirements:', 'Truthful completion language:', 'Stop condition:',
];
const bodies = new Map();
phases.forEach((phase, index) => {
  const next = phases[index + 1]?.index ?? doc.indexOf('\n## Dependency graph');
  const body = doc.slice(phase.index, next);
  bodies.set(phase.id, body);
  for (const label of required) if (!body.includes(`- ${label}`)) fail(`${phase.id} missing ${label}`);
});

const predecessorPhrases = {
  'IFP-1': '- Dependencies: merged deterministic foundations.',
  'IFP-2': '- Dependencies: IFP-1 closed;',
  'IFP-3': '- Dependencies: IFP-2 closed.',
  'IFP-4': '- Dependencies: IFP-3 closed.',
  'IFP-5': '- Dependencies: IFP-4 closed;',
  'IFP-6': '- Dependencies: IFP-5 closed.',
  'IFP-7': '- Dependencies: IFP-6 closed.',
  'IFP-8': '- Dependencies: IFP-7 closed and all preceding IFP evidence closed;',
};
for (const [phaseId, phrase] of Object.entries(predecessorPhrases)) {
  if (!bodies.get(phaseId)?.includes(phrase)) fail(`${phaseId} missing canonical predecessor dependency phrase`);
}

const requiredDocPhrases = [
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
  'No IFP phase may claim production validation from fixtures alone',
  'predeclared evidence-sufficiency policy',
  'mandatory launch coverage matrix',
  'held-out evaluation not used to select the calibration change',
  'previous-configuration recovery proof',
  'Formula or algorithm defects require a separate explicitly approved reasoning-correction dependency',
  'unresolved insufficient-data status for mandatory launch intelligence coverage',
];
for (const phrase of requiredDocPhrases) if (!doc.includes(phrase)) fail(`missing required IFP phrase: ${phrase}`);

const ifp3 = bodies.get('IFP-3') ?? '';
if (!ifp3.includes('diagnose confidence-floor saturation empirically') || !ifp3.includes('it does not mean formulas were changed')) fail('IFP-3 is not clearly diagnosis-only');
if (!ifp3.includes('Prohibited scope: raising confidence values, weakening penalties, confidence tier changes, adaptive self-modifying confidence engine, golden expectation edits')) fail('IFP-3 prohibited scope is incomplete');

const ifp8 = bodies.get('IFP-8') ?? '';
const ifp8Required = [
  'IFP-1 configuration registry',
  'versioned configuration artifacts only when an evidence-backed configuration change is explicitly approved',
  'supported by IFP-2 through IFP-5 empirical evidence',
  'held-out data',
  'fixture pass-rate improvement alone was not used as justification',
  'formula or algorithm change treated silently as calibration',
  'previous-version recovery',
];
for (const phrase of ifp8Required) if (!ifp8.includes(phrase)) fail(`IFP-8 missing calibration boundary phrase: ${phrase}`);

const ifp2 = bodies.get('IFP-2') ?? '';
for (const phrase of ['mandatory launch assets or approved asset groups', 'required event classes', 'required horizons', 'minimum sample or evidence-sufficiency policy', 'sparse or structurally unavailable slices', 'calibration/evaluation separation']) {
  if (!ifp2.includes(phrase)) fail(`IFP-2 missing evidence-sufficiency ownership phrase: ${phrase}`);
}

for (const path of alignmentDocs) {
  const content = read(path);
  for (const phrase of ['docs/intelligence-feature-program.md', 'IFP-0 defines the program but implements no intelligence feature', 'IFP is not complete merely because the scope document exists', 'RC-I2-CERT remains mandatory', 'RC-J-ENV remains mandatory', 'RC-K begins only after all eight IFP phases are closed']) {
    if (!content.includes(phrase)) fail(`${path} missing alignment phrase: ${phrase}`);
  }
}

if (/^### .*C6-R9H|^### .*C6-R10|Phase ID: C6-R9H|Phase ID: C6-R10|^### C6-/m.test(doc)) fail('prohibited C6-R9H, C6-R10, or new C6 phase introduced');
if (/^### Affiliate-\d+/m.test(doc) || /^### IFP-\d+.*Affiliate/im.test(doc)) fail('affiliate phase represented as IFP phase');
for (const [path, content] of [['docs/intelligence-feature-program.md', doc], ...alignmentDocs.map((path) => [path, read(path)])]) {
  if (/\b(deferred|postponed)\b/i.test(content)) fail(`prohibited launch-delay terminology appears in ${path}`);
}

if (failures.length) {
  console.error('IFP documentation consistency check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('IFP documentation consistency check passed.');
