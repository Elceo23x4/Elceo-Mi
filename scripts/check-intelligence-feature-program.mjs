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

const capabilityRequirements = {
  'IFP-1': ['pre-event expectation', 'actual and forecast', 'previous and revised previous', 'normalized surprise', 'primary-asset price reaction', 'follow-through', 'related-market response', 'volatility adjustment', 'confidence shift', 'immutable audit trail'],
  'IFP-2': ['Historical Market Memory / Analog Engine', 'analog retrieval engine', 'nearest-analog explanations'],
  'IFP-3': ['Contradiction-to-Action Protocol', 'protocol states', 'review, wait, invalidate, escalate, or archive'],
  'IFP-4': ['Market Cleanliness', 'cleanliness score with visible components', 'session/liquidity context'],
  'IFP-5': ['News Half-Life / Narrative Decay', 'narrative half-life', 'active/decaying/expired states'],
  'IFP-6': ['Crowd Pain / Positioning Stress', 'stress-map states', 'positioning limitations'],
  'IFP-7': ['Fragility Score', 'component ledger', 'severity thresholds']
};
for (const [phaseId, phrases] of Object.entries(capabilityRequirements)) {
  const body = bodies.get(phaseId) ?? '';
  for (const phrase of phrases) if (!body.includes(phrase) && !doc.includes(phrase)) fail(`${phaseId} missing capability requirement: ${phrase}`);
}

const ifp1Body = bodies.get('IFP-1') ?? '';
for (const stale of ['configuration is versioned and auditable', 'parameter family has an owner', 'rollback path', 'configuration evidence ledger suitable for calibration comparisons']) {
  if (ifp1Body.includes(stale)) fail(`IFP-1 contains stale configuration-program language: ${stale}`);
}


const staleByPhase = {
  'IFP-2': ['dataset manifests', 'training/evaluation dataset separation'],
  'IFP-3': ['confidence-floor saturation diagnosis', 'false-zero/true-zero analysis'],
  'IFP-4': ['backtest harnesses', 'universal aggregate score as proof'],
  'IFP-5': ['reliability version registry', 'drift review cadence'],
  'IFP-6': ['alert threshold evidence', 'cooldown/dedupe acceptance', 'trade-readiness and alert-throttling validation'],
  'IFP-7': ['readability review rubric', 'frontend redesign', 'decision-path persistence model'],
  'IFP-8': ['IFP-1 configuration registry']
};
for (const [phaseId, phrases] of Object.entries(staleByPhase)) {
  const body = bodies.get(phaseId) ?? '';
  for (const phrase of phrases) if (body.includes(phrase)) fail(`${phaseId} contains stale non-engine language: ${phrase}`);
}

const ifp8 = bodies.get('IFP-8') ?? '';
const ifp8Required = [
  'cross-cutting configuration/version records',
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

for (const phrase of ['docs/historical-market-memory-analog-engine.md', '0043_historical_market_memory_analog_engine.sql', 'HistoricalAnalogMemoryRecord', 'AnalogMatchFeatures', 'HistoricalOutcomeContext', 'historical-analog-retrieval-v1']) {
  const sources = doc + read('docs/historical-market-memory-analog-engine.md') + read('services/reasoning/src/historical-analog-memory/contracts.ts') + read('services/reasoning/src/historical-analog-memory/policy.ts') + read('infra/db/schema/0043_historical_market_memory_analog_engine.sql');
  if (!sources.includes(phrase)) fail(`IFP-2 implementation surface missing: ${phrase}`);
}


const ifp2TestSurface = read('services/reasoning/src/tests/historical-analog-memory.test.ts');
const ifp2SourceSurface = [
  read('services/reasoning/src/historical-analog-memory/feature-extraction.ts'),
  read('services/reasoning/src/historical-analog-memory/similarity.ts'),
  read('services/reasoning/src/historical-analog-memory/service.ts'),
  read('services/reasoning/src/historical-analog-memory/sql-repository.ts'),
  read('services/reasoning/src/historical-analog-memory/repository.ts'),
  read('services/reasoning/src/historical-analog-memory/policy.ts'),
  read('services/reasoning/src/tests/run-tests.ts'),
].join('\n');
for (const phrase of [
  'scoreAnalogFeatures(featuresA,featuresB)',
  'outcome-only changes do not affect scoreAnalogFeatures results',
  'actual retrieval/ranking is invariant to outcome-only candidate changes',
  'same-family cross-asset non-tautological direction relation strictly owns asset-direction similarity',
  'releaseTrustSatisfiedAt',
  'immediate volatility is scoreable at T+1',
  'coverage counts production verified/replay unique event instances only',
  'memory repository rejects malformed retrieval invariants SQL also rejects',
  'T+3 ignores divergent T+6 follow-through',
  'same event and cross-asset same event excluded',
  'SqlHistoricalAnalogRepository requires transaction executor',
  'retrieval finds relevant analog beyond 500 and 1000 paged memory records',
  'complete tuple pagination beyond 1000 has no gaps or duplicates',
  'unrelated wrong-family memory does not change memorySnapshotHash retrievalId or returned ranking',
  'no_comparable_history state is exact',
  'sufficient state is exact',
  'cross-asset orientation derives from source EventRealityEvaluation objects',
  'SqlHistoricalAnalogRepository',
  'rollback after conflict at rank 3 leaves no partial retrieval rows',
  'structural unavailable explicit policy decision has reason/version, while non-matching empty cells remain missing',
  'complete historical trust validator',
  'query maturity is reported separately from candidate overlap and grows with horizon',
  'normalized retrieval limits handle negative and positive bounded values deterministically',
  'canonical release verification artifact deduplicates copied verifier evidence while preserving covered source IDs',
  'unknown relation versus unknown is non-comparable, reduces coverage, and cannot create high similarity',
  'stage-aware historical feature timeline persists T+1 T+3 and final snapshots from immutable assessments',
  'assessment timeline lists provisional and final evaluations in interpretedAt tuple order',
  'featureCoverageRatio <= 1 for every persisted match',
  'stage timeline identity binds T+1/T+3 snapshots into stage and feature hash while analogMemoryId remains source-stable',
  'final-only T+6 memory yields insufficient_feature_overlap at T+1/T+3 and remains usable at T+6',
  'verificationRef alone cannot become trustBasis for release trust',
  'early-stage retrieval persists successfully through SQL schema contract with bounded coverage',
  'T+6-only mutation leaves T+3 retrieval identity score components coverage rank and ordering unchanged',
  'post-final assessments cannot enter memory or change stage hash feature hash or analogMemoryId',
  'coverage uses actual stage snapshots so final-only records count follow-through but not immediate or confirmation',
  'raw fixture plus effective verified release is terminally rejected from runtime history',
  'memory/SQL numeric invariant parity rejects',
    'limit 1 and limit 10 share one canonical maximum persisted retrieval without immutable conflict',
    'operational memory availability is clock-owned and cannot be backdated to source interpretation',
    'retrieval identity binds feature policy and query feature hash even for an empty candidate snapshot',
    'delayed indexing changes operational availability without changing source-event evidence identity',
    'raw fixture effective verified ${label} is terminally rejected from runtime history',
    'equal-time stage selection prefers final semantically and is insertion-order independent',
    'same repository commits outcome-only changes through separate immutable attachment identity without changing ranking',
    'untrusted T+1 stage remains auditable while release direction path volatility and provenance groups are unavailable',
    'T+1 retrieval cannot score untrusted stage features while T+6 retrieval uses trusted final stage',
    'coverage does not count an untrusted immediate stage',
    'simultaneous identical SQL retrieval saves are race-idempotent with one parent and one ranked set',
    'simultaneous conflicting SQL retrieval content cannot silently succeed or append rows',
    'SqlEventRealityRepository timeline retains provisional and final rows with memory-parity tuple paging',
    'SqlHistoricalAnalogRepository tuple pages match memory ordering with no gaps or duplicates and later pages reachable',
    'identical indexing retry preserves first memory availability and does not call the clock again',
    'changed stageFeatureTimelineHash fails immutable analog-memory replay',
    'invalid ${label} verifiedAt is rejected and cannot produce verified runtime memory',
    'clean official witness plus secondary fixture indexes while secondary fixture remains an audit limitation',
    "selectedStageProvenanceEligibility==='provenance_limited'",
    'trusted release plus trusted primary produces eligible immediate-stage coverage',
    'trusted primary with untrusted release does not count as production immediate coverage',
    'canonical reaction trust witness rejects ${label}',
    'valid T+3 verification for T+3 reaction data remains accepted',
    'memory clock ${label} is rejected and cannot create backdated retrievable memory',
    'memory clock before an included later stage-createdAt is rejected',
    'final-only T+6 memory yields insufficient_feature_overlap at T+1/T+3 and remains usable at T+6',
    'one trustworthy coverage-eligible T+1 stage is sparse rather than stage-limited',

]) if (!ifp2TestSurface.includes(phrase)) fail(`IFP-2 behavioural test surface missing: ${phrase}`);
for (const phrase of [
  'resolvedDirectionRelationToFrozenExpectation',
  'aligned_with_resolved_direction',
  'opposed_to_resolved_direction',
  'pathDirectionRelation',
  'signedMoveInResolvedDirectionPct',
  'trustedReleaseWitnesses',
  'secondary_untrusted_release_provenance',
  'normalizeHistoricalAnalogPageLimit',
  'resolveHistoricalAnalogStructuralAvailability',
  'SqlHistoricalAnalogTransactionExecutor',
  'runHistoricalAnalogMemoryTests',
  'validateHistoricalIndexingEvidence',
  'HistoricalAnalogStructuralAvailabilityRule',
  'HistoricalAnalogStructuralAvailabilityPolicy',
  'HISTORICAL_ANALOG_COVERAGE_STRUCTURAL_POLICY',
  'normalizeHistoricalAnalogResultLimit',
  'queryEvidenceMaturityRatio',
  'HistoricalReleaseVerificationArtifact',
  'HistoricalAnalogStageFeatureSnapshot',
  'stageFeatureTimelineHash',
  'no_comparable_stage_snapshot',
  'trustedReleaseVerificationRefs',
]) if (!ifp2SourceSurface.includes(phrase)) fail(`IFP-2 source/test-runner surface missing: ${phrase}`);

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
