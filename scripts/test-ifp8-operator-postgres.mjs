import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_required_for_ifp8_operator_postgres');
const root = new URL('../', import.meta.url), pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const migration = await readFile(new URL('../infra/db/schema/0054_ifp8_acceptance_operator.sql', import.meta.url), 'utf8');
await pool.query(migration);
const api = await import('../services/reasoning/dist-test-cjs/services/reasoning/src/intelligence-acceptance/index.cjs');
const directory = await mkdtemp(join(tmpdir(), 'ifp8-operator-'));
const runFamilyId = `ifp8-operator-pg-${Date.now()}`, at = '2026-01-01T04:00:00.000Z';
const artifactBody = Buffer.from('TEST-ONLY empirical-shaped artifact; never production certification');
const artifactHash = createHash('sha256').update(artifactBody).digest('hex');
const manifest = api.finalizeDatasetManifest({
  datasetId: `${runFamilyId}-dataset`, datasetVersion: 'test-only-v1', datasetClass: 'certified_replay',
  generatedAt: at, periodStart: '2025-01-01T00:00:00.000Z', periodEnd: '2025-12-01T00:00:00.000Z',
  sourceRegistryVersion: 'test-only-v1', sourceRegistryHash: '1'.repeat(64), sourceIds: ['test-only-source'],
  assetCoverage: ['xau_usd'], eventClassCoverage: ['cpi'], horizonCoverage: ['follow_through'],
  sampleCount: 1, eventInstanceCount: 3, provenanceSummary: 'TEST-ONLY operator PostgreSQL acceptance',
  rawArtifactHashes: [artifactHash], normalizationPolicyVersion: 'test-v1', outcomePolicyVersion: 'test-v1', splitPolicyVersion: 'test-v1',
  calibrationPartitionHash: api.partitionHash(['cal']), embargoPartitionHash: api.partitionHash(['emb']), holdoutPartitionHash: api.partitionHash(['hold']),
});
const certification = api.finalizeCertification({
  datasetId: manifest.datasetId, datasetVersion: manifest.datasetVersion, datasetManifestHash: manifest.canonicalPayloadHash,
  claimedDatasetClass: manifest.datasetClass, sourceRegistryVersion: manifest.sourceRegistryVersion, sourceRegistryHash: manifest.sourceRegistryHash,
  rawArtifactHashes: [artifactHash], captureReplayProvenance: ['test-capture'], sourceIds: manifest.sourceIds,
  reliabilitySummary: { verified: 1 }, fixtureContamination: false, unverifiedContamination: false,
  certificationEvidenceReferences: ['test-cert-ref'], certifiedAt: at,
});
const split = api.finalizeSplit({ datasetId: manifest.datasetId, calibrationEventIds: ['cal'], embargoEventIds: ['emb'], holdoutEventIds: ['hold'],
  eventFamilies: { cal: 'cal-family', emb: 'emb-family', hold: 'hold-family' },
  eventTimes: { cal: '2025-01-01T00:00:00Z', emb: '2025-01-04T00:00:00Z', hold: '2025-01-10T00:00:00Z' },
  outcomeWindowEnds: { cal: '2025-01-02T00:00:00Z', emb: '2025-01-05T00:00:00Z', hold: '2025-01-11T00:00:00Z' }, maximumOutcomeHorizonMs: 86400000, createdAt: at });
const evidence = { caseId: 'operator-case', eventInstanceId: 'hold', eventFamilyId: 'hold-family', evidenceCutoffAt: '2026-01-01T01:00:00.000Z', asset: 'xau_usd', eventClass: 'cpi', horizon: 'follow_through', qualifiedEvidenceFamilies: [], references: [], productionInput: { eventEvaluationId: 'test-only-missing-event', evidenceCutoffAt: '2026-01-01T01:00:00.000Z' } };
const rollback = api.createRollbackEvidence({ datasetId: manifest.datasetId, splitId: split.splitId, acceptanceRunFamilyId: runFamilyId,
  fromConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId, restoredConfigurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId,
  expectedPreviousParameterSnapshotHash: api.CANONICAL_RUNTIME_BASELINE.parameterSnapshotHash, restoredParameterSnapshotHash: api.CANONICAL_RUNTIME_BASELINE.parameterSnapshotHash,
  reproductions: [{ caseId: evidence.caseId, decisionTimeEvidenceHash: api.canonicalHash(evidence), previousCanonicalOutputHash: '2'.repeat(64), restoredCanonicalOutputHash: '2'.repeat(64), match: true }], createdAt: at });
const approved = (body) => ({ ...body, canonicalPayloadHash: api.canonicalHash(body) });
const coveragePolicy = approved({ coveragePolicyId: 'TEST-ONLY-operator-coverage', status: 'approved', cells: [], diagnosticAssets: [], approvalReference: 'test-coverage-approval' });
const outcomePolicy = approved({ policyId: 'TEST-ONLY-operator-outcome', policyVersion: 'test-v1', status: 'approved', supportedProperties: [], approvalReference: 'test-outcome-approval' });
const minimumSamples = Object.fromEntries(['ifp1','ifp2','ifp3','ifp4','ifp5','ifp6','ifp7'].map((key) => [key, 1]));
const requiredMetrics = Object.fromEntries(Object.keys(minimumSamples).map((key) => [key, []]));
const empiricalPolicy = approved({ policyId: 'TEST-ONLY-operator-empirical', policyVersion: 'test-v1', status: 'approved', minimumSamples, requiredMetrics, approvalReference: 'test-empirical-approval', criteria: [] });
const residualBody = { riskId: `${runFamilyId}-blocking-risk`, scope: 'test-only', severity: 'high', evidence: ['test-only'], affectedAssets: ['xau_usd'], eventClasses: ['cpi'], horizons: ['follow_through'], classification: 'empirical_limitation', resolutionState: 'open', blocksAcceptance: true, owner: 'test', createdAt: at };
const residualRisk = { ...residualBody, canonicalPayloadHash: api.canonicalHash(residualBody) };
const bundleBody = { schemaVersion: 'ifp8-acceptance-operator-v1', runFamilyId, datasetId: manifest.datasetId,
  configurationVersionId: api.CANONICAL_RUNTIME_BASELINE.configurationVersionId, rollbackEvidenceId: rollback.rollbackEvidenceId, importedAt: at,
  records: [['dataset_manifest', manifest.datasetId, manifest], ['dataset_certification', manifest.datasetId, certification], ['split_manifest', manifest.datasetId, split], ['configuration_version', api.CANONICAL_RUNTIME_BASELINE.configurationVersionId, api.CANONICAL_RUNTIME_BASELINE], ['rollback_evidence', rollback.rollbackEvidenceId, rollback], ['residual_risk', residualRisk.riskId, residualRisk]].map(([kind,id,value]) => ({ kind,id,value })),
  rawArtifacts: [{ contentBase64: artifactBody.toString('base64'), contentHash: artifactHash, certificationReference: 'test-cert-ref' }],
  coverageAuthority: { policy: coveragePolicy }, approvedStructuralDecisionIds: [], outcomePolicyAuthority: outcomePolicy,
  empiricalAcceptancePolicyAuthority: empiricalPolicy, decisionTimeCaseEvidence: [evidence], outcomeObservations: [], residualRisks: [residualRisk] };
const bundle = { ...bundleBody, canonicalPayloadHash: api.canonicalHash(bundleBody) }, bundlePath = join(directory, 'bundle.json');
await writeFile(bundlePath, JSON.stringify(bundle));
const invoke = (args, npm = false) => {
  const command = npm ? 'npm' : process.execPath, commandArgs = npm ? ['run','ifp8:acceptance','--',...args] : ['scripts/ifp8-acceptance.mjs',...args];
  return spawnSync(command, commandArgs, { cwd: new URL('../', import.meta.url), env: process.env, encoding: 'utf8' });
};
const succeeds = (args, npm = false) => { const result = invoke(args, npm); assert.equal(result.status, 0, result.stderr || result.stdout); return JSON.parse(result.stdout.trim().split('\n').at(-1)); };
try {
  const imported = succeeds(['import','--bundle',bundlePath], true);
  assert.equal(imported.holdoutState, 'unselected');
  assert.equal(succeeds(['status','--run-family',runFamilyId]).holdoutState, 'unselected');
  succeeds(['import','--bundle',bundlePath]);
  const preflight = succeeds(['preflight','--run-family',runFamilyId]);
  assert.equal(preflight.holdoutState, 'selected');
  assert.equal(succeeds(['status','--run-family',runFamilyId]).holdoutState, 'selected');
  assert.notEqual(invoke(['open-holdout','--run-family',runFamilyId,'--confirm','bad']).status, 0);
  succeeds(['open-holdout','--run-family',runFamilyId,'--confirm',preflight.confirmation]);
  assert.notEqual(invoke(['open-holdout','--run-family',runFamilyId,'--confirm',preflight.confirmation]).status, 0);
  const evaluated = invoke(['evaluate','--run-family',runFamilyId]);
  assert.notEqual(evaluated.status, 0);
  assert.equal(succeeds(['status','--run-family',runFamilyId]).holdoutState, 'failed');
  assert.notEqual(invoke(['evaluate','--run-family',runFamilyId]).status, 0);
  const exportPath = join(directory, 'export.json');
  succeeds(['export-evidence','--run-family',runFamilyId,'--output',exportPath]);
  const exported = JSON.parse(await readFile(exportPath, 'utf8')), { overallEvidenceChecksum, ...exportBody } = exported;
  assert.equal(api.canonicalHash(exportBody), overallEvidenceChecksum);
  const serialized = JSON.stringify(exported);
  assert(!serialized.includes(artifactBody.toString('base64')) && !serialized.includes('decisionTimeCaseEvidence') && !serialized.includes('outcomeObservations'));
  await pool.query("UPDATE intelligence_acceptance_operator_bundles SET canonical_payload=jsonb_set(canonical_payload,'{datasetId}',to_jsonb('tampered'::text)) WHERE acceptance_run_family_id=$1", [runFamilyId]);
  assert.match(invoke(['status','--run-family',runFamilyId]).stderr, /operator_bundle_integrity_invalid/);
  console.log('IFP-8 operator PostgreSQL separate-process import/status/preflight/open/failure/export/tamper acceptance passed');
} finally { await pool.end(); }
