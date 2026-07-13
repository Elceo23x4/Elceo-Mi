import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const doc = read('docs/intelligence-feature-program.md');
const ci = read('.github/workflows/ci.yml');
const releaseGate = read('scripts/release-gate.mjs');
const deploymentGate = read('scripts/verify-deployment-promotion-gates.mjs');
const rcjSelfTest = read('scripts/security-rc-j-self-test.mjs');
const readinessChecklist = read('docs/production-readiness-checklist.md');
const packageJson = JSON.parse(read('package.json'));
const alignmentDocs = [
  'docs/backend-open-loop-register.md',
  'docs/final-production-status-report.md',
  'docs/production-readiness-checklist.md',
  'docs/post-r9-cleanup-execution-plan.md',
];

const statusDocs = [
  'docs/backend-open-loop-register.md',
  'docs/final-production-status-report.md',
  'docs/production-readiness-checklist.md',
  'docs/post-r9-cleanup-execution-plan.md',
];

const sectionBetween = (content, startHeading, endHeading) => {
  const start = content.indexOf(startHeading);
  if (start === -1) return '';
  const afterStart = start + startHeading.length;
  const end = content.indexOf(endHeading, afterStart);
  return content.slice(start, end === -1 ? content.length : end);
};
const failures = [];
const fail = (message) => failures.push(message);

if (packageJson.scripts?.['check:ifp'] !== 'node scripts/check-intelligence-feature-program.mjs') fail('package.json check:ifp script is missing or changed');
if (!/name:\s*Check Intelligence Feature Program contract[\s\S]*?run:\s*npm run check:ifp/.test(ci)) fail('GitHub CI does not run check:ifp with the expected step name');
if (!/label:\s*['"]npm run check:ifp['"][\s\S]*?args:\s*\[[^\]]*['"]run['"][^\]]*['"]check:ifp['"][^\]]*\]/.test(releaseGate)) fail('release gate does not include npm run check:ifp');


const canonicalPhaseNames = [
  'Expectation-Reality Delta Engine',
  'Historical Market Memory / Analog Engine',
  'Contradiction-to-Action Protocol',
  'Market Cleanliness Ranking',
  'News Half-Life / Narrative Decay',
  'Crowd Pain / Positioning Stress Map',
  'Fragility Score',
  'Production-Data Calibration and Intelligence Acceptance Evidence Gate'
];
const phases = [...doc.matchAll(/^### (IFP-(\d+)) — (.+)$/gm)].map((match) => ({ id: match[1], n: Number(match[2]), name: match[3], index: match.index }));
if (phases.length !== 8) fail(`expected exactly 8 canonical phases, found ${phases.length}`);
phases.forEach((phase, index) => {
  if (phase.n !== index + 1) fail(`phase order mismatch at ${phase.id}`);
  if (phase.id !== `IFP-${index + 1}`) fail(`phase id mismatch: ${phase.id}`);
  if (phase.name !== canonicalPhaseNames[index]) fail(`phase name mismatch for ${phase.id}: ${phase.name}`);
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

if (!doc.includes('diagnose confidence-floor saturation empirically') || !doc.includes('it does not mean formulas were changed')) fail('confidence-floor diagnosis boundary is missing');
if (!doc.includes('Prohibited scope: raising confidence values, weakening penalties, confidence tier changes, adaptive self-modifying confidence engine, golden expectation edits')) fail('confidence prohibited scope is incomplete');


const capabilityRequirements = {
  'IFP-1': ['pre-event expectation', 'actual and forecast', 'previous and revised previous', 'normalized surprise', 'primary-asset price reaction', 'follow-through', 'related-market response', 'volatility adjustment', 'confidence shift', 'immutable audit trail'],
  'IFP-2': ['Historical Market Memory / Analog Engine', 'IFP-1 event expectation-reality records'],
  'IFP-3': ['Contradiction-to-Action Protocol', 'without changing confidence formulas'],
  'IFP-4': ['Market Cleanliness', 'price reaction clarity', 'related-market confirmation'],
  'IFP-5': ['News Half-Life / Narrative Decay', 'release versions', 'post-release reaction persistence'],
  'IFP-6': ['Crowd Pain / Positioning Stress', 'positioning evidence', 'follow-through failures'],
  'IFP-7': ['Fragility Score', 'absorption', 'reversal', 'mispricing-candidate']
};
for (const [phaseId, phrases] of Object.entries(capabilityRequirements)) {
  const body = bodies.get(phaseId) ?? '';
  for (const phrase of phrases) if (!body.includes(phrase) && !doc.includes(phrase)) fail(`${phaseId} missing capability requirement: ${phrase}`);
}

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


for (const path of statusDocs) {
  const content = read(path);
  const currentStatus = [
    sectionBetween(content, '## RC-I3 notification reliability layer', '## IFP-0 canonical scope lock alignment'),
    sectionBetween(content, '## RC-J validation framework', '## IFP-0 canonical scope lock alignment'),
    sectionBetween(content, '## IFP-0 canonical scope lock alignment', '\n## '),
  ].join('\n');
  for (const phrase of [
    'RC-J validation framework is merged',
    'RC-J-ENV remains a mandatory unresolved pre-launch blocker',
    'RC-I2-CERT remains a mandatory unresolved pre-launch blocker',
    'IFP remains the active mandatory pre-launch program',
    'RC-K begins only after all eight IFP phases close',
  ]) {
    if (!currentStatus.includes(phrase)) fail(`${path} missing current lifecycle phrase: ${phrase}`);
  }
  if (currentStatus.includes('RC-J remains a mandatory subsequent launch batch')) fail(`${path} contains stale current RC-J lifecycle phrase`);
}



const deploymentGateRequirements = [
  'RC_J_ENV_EVIDENCE',
  "const explicitPassFlags = ['RELEASE_GATE_PASSED', 'SECURITY_GATE_PASSED', 'MIGRATION_CHECK_PASSED'];",
  "const evidenceReferences = ['STAGING_SMOKE_EVIDENCE', 'RC_I2_CERT_EVIDENCE', 'RC_J_ENV_EVIDENCE'];",
  "const falseLikeValues = new Set(['false', '0', 'no', 'failed', 'failure', 'missing', 'incomplete', 'unavailable', 'not_completed']);",
  'isExplicitPass',
  'isValidEvidenceReference',
  'missing, invalid',
];
for (const phrase of deploymentGateRequirements) {
  if (!deploymentGate.includes(phrase)) fail(`deployment promotion gate missing contract phrase: ${phrase}`);
}

for (const phrase of [
  'deployment gate requires RC-J-ENV evidence',
  'deployment gate rejects false RC-J-ENV evidence',
  'deployment gate rejects false release gate flag',
  'deployment gate rejects zero security gate flag',
  'deployment gate rejects incomplete RC-I2 evidence',
  'deployment gate passes with full valid evidence',
  'deployment gate blocks provider live activation',
]) {
  if (!rcjSelfTest.includes(phrase)) fail(`RC-J self-test missing deployment gate coverage: ${phrase}`);
}

if (!readinessChecklist.includes('RC-J-ENV evidence before final launch')) fail('readiness checklist no longer requires RC-J-ENV evidence before final launch');
if (!readinessChecklist.includes('RC-I2-CERT remains a mandatory unresolved pre-launch blocker') || !readinessChecklist.includes('RC-J-ENV remains a mandatory unresolved pre-launch blocker') || !readinessChecklist.includes('IFP remains the active mandatory pre-launch program') || !readinessChecklist.includes('RC-K begins only after all eight IFP phases close')) fail('readiness checklist no longer carries RC-I2-CERT, RC-J-ENV, IFP, and RC-K launch dependency language');

const productionStatus = read('docs/final-production-status-report.md');
const blockerSentence = 'Production launch remains blocked until RC-I2-CERT, RC-J-ENV, IFP, and RC-K are complete';
if (!productionStatus.includes(blockerSentence)) fail('final production blocker list does not include RC-I2-CERT, RC-J-ENV, IFP, and RC-K');
if (productionStatus.includes('RC-J remains a mandatory subsequent launch batch')) fail('final production status contains stale RC-J current lifecycle phrase');

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
