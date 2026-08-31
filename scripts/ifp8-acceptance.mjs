#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const VERSION = 'ifp8-acceptance-operator-v1';
const operations = new Set(['import', 'status', 'preflight', 'open-holdout', 'evaluate', 'export-evidence']);
const fail = (code) => { throw new Error(code); };
const args = process.argv.slice(2), operation = args.shift();
if (!operation || !operations.has(operation)) fail(operation ? 'unsupported_operation' : 'operation_required');
const options = new Map();
while (args.length) {
  const key = args.shift();
  if (!key?.startsWith('--') || !args.length) fail('invalid_arguments');
  if (options.has(key)) fail('duplicate_argument');
  options.set(key, args.shift());
}
if (!process.env.DATABASE_URL) fail('DATABASE_URL_required');
const { default: pg } = await import('pg');
const api = await import('../services/reasoning/dist/intelligence-acceptance/index.js');
const persistenceApi = await import('../services/reasoning/dist/persistence/index.js');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const repository = new api.SqlIntelligenceAcceptanceRepository(pool);
const canonical = (value) => api.canonicalHash(value);
const secretKey = /secret|password|credential|private.?key|api.?key|token/i;
const assertNoSecrets = (value, path = '$') => {
  if (Array.isArray(value)) return value.forEach((v, i) => assertNoSecrets(v, `${path}[${i}]`));
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    if (secretKey.test(key)) fail(`secret_field_forbidden:${path}.${key}`);
    assertNoSecrets(child, `${path}.${key}`);
  }
};
const readBundle = async (path) => {
  if (!path) fail('bundle_path_required');
  let value; try { value = JSON.parse(await readFile(path, 'utf8')); } catch { fail('malformed_input_bundle'); }
  if (!value || value.schemaVersion !== VERSION || !value.runFamilyId || !value.datasetId ||
      !value.configurationVersionId || !value.rollbackEvidenceId || !value.importedAt ||
      !Number.isFinite(Date.parse(value.importedAt)) || !Array.isArray(value.records)) fail('invalid_input_bundle_contract');
  assertNoSecrets(value);
  if (value.canonicalPayloadHash !== canonical(Object.fromEntries(Object.entries(value).filter(([k]) => k !== 'canonicalPayloadHash')))) fail('input_bundle_hash_mismatch');
  for (const artifact of value.rawArtifacts ?? []) {
    if (!artifact.certificationReference) fail('raw_artifact_certification_reference_missing');
    const actual = createHash('sha256').update(Buffer.from(artifact.contentBase64, 'base64')).digest('hex');
    if (actual !== artifact.contentHash) fail('raw_artifact_content_hash_mismatch');
  }
  return value;
};
const loadBundle = async () => {
  const id = options.get('--run-family'); if (!id) fail('run_family_required');
  const q = await pool.query('SELECT canonical_payload FROM intelligence_acceptance_operator_bundles WHERE acceptance_run_family_id=$1', [id]);
  if (!q.rows[0]) fail('operator_bundle_missing');
  return q.rows[0].canonical_payload;
};
const authorities = (bundle) => ({
  certification: { verify: async (certification, manifest) => certification.datasetManifestHash === manifest.canonicalPayloadHash && !api.verifyDatasetCertification(manifest, certification).length },
  coverage: { resolve: async () => bundle.coverageAuthority?.policy?.status === 'approved' ? { policy: bundle.coverageAuthority.policy, approvedStructuralDecisionIds: new Set(bundle.approvedStructuralDecisionIds ?? []) } : null },
  policies: { resolveOutcomePolicy: async () => bundle.outcomePolicyAuthority ?? null, resolveEmpiricalPolicy: async () => bundle.empiricalAcceptancePolicyAuthority ?? null },
});
const createService = (bundle) => {
  const authority = authorities(bundle);
  const cases = new Map((bundle.decisionTimeCaseEvidence ?? []).map((x) => [x.caseId, x]));
  const outcomes = new Map((bundle.outcomeObservations ?? []).map((x) => [x.caseId, x.input]));
  return new api.IntelligenceAcceptanceService(repository,
    new api.ProductionIfpChainAdapter(persistenceApi.createReasoningPersistenceRepository(process.env), new api.CanonicalRuntimeBaselineAuthority()),
    { list: async (_dataset, ids) => ids.map((id) => [...cases.values()].find((x) => x.eventInstanceId === id)).filter(Boolean), outcomeObservations: async (id) => outcomes.get(id) ?? null },
    authority.certification, authority.coverage, authority.policies);
};
const input = (bundle) => ({ runFamilyId: bundle.runFamilyId, datasetId: bundle.datasetId, configurationVersionId: bundle.configurationVersionId, rollbackEvidenceId: bundle.rollbackEvidenceId });
try {
  if (operation === 'import') {
    const bundle = await readBundle(options.get('--bundle'));
    const allowedKinds = new Set(['dataset_manifest', 'dataset_certification', 'split_manifest', 'configuration_version', 'calibration_trial', 'rollback_evidence', 'residual_risk']);
    for (const row of bundle.records) {
      if (!allowedKinds.has(row.kind) || !row.id || !row.value) fail('invalid_import_record');
      api.validateAcceptanceEntity(row.kind, row.id, row.value);
    }
    const manifest = bundle.records.find((row) => row.kind === 'dataset_manifest' && row.id === bundle.datasetId)?.value;
    if (!manifest) fail('operator_dataset_manifest_missing');
    if (['fixture', 'golden_fixture', 'dry_run', 'captured_fixture', 'unknown'].includes(manifest.datasetClass)) fail('non_qualifying_dataset_class');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query('SELECT canonical_payload_hash FROM intelligence_acceptance_operator_bundles WHERE acceptance_run_family_id=$1 FOR UPDATE', [bundle.runFamilyId]);
      if (found.rows[0] && found.rows[0].canonical_payload_hash !== bundle.canonicalPayloadHash) fail('immutable_operator_bundle_conflict');
      if (!found.rows[0]) await client.query('INSERT INTO intelligence_acceptance_operator_bundles VALUES($1,$2,$3,$4,$5)', [bundle.runFamilyId, VERSION, JSON.stringify(bundle), bundle.canonicalPayloadHash, new Date().toISOString()]);
      await client.query('COMMIT');
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    for (const row of bundle.records) await repository.save(row.kind, row.id, row.value);
    const split = await repository.get('split_manifest', bundle.datasetId);
    if (!split) fail('ifp8_split_manifest_missing');
    await repository.freezeCandidate(api.createHoldoutLifecycle({ acceptanceRunFamilyId: bundle.runFamilyId, datasetId: bundle.datasetId, holdoutPartitionHash: split.holdoutPartitionHash, selectedConfigurationVersionId: bundle.configurationVersionId, selectedAt: bundle.importedAt }));
    console.log(JSON.stringify({ operation, runFamilyId: bundle.runFamilyId, imported: true }));
  } else {
    const bundle = await loadBundle(), lifecycle = await repository.get('holdout_lifecycle', bundle.runFamilyId);
    if (operation === 'status') {
      const checks = await Promise.all([repository.get('dataset_manifest', bundle.datasetId), repository.get('dataset_certification', bundle.datasetId), repository.get('split_manifest', bundle.datasetId), repository.get('configuration_version', bundle.configurationVersionId), repository.get('rollback_evidence', bundle.rollbackEvidenceId)]);
      console.log(JSON.stringify({ schemaVersion: VERSION, runFamilyId: bundle.runFamilyId, datasetPresent: !!checks[0], certificationPresent: !!checks[1], splitPresent: !!checks[2], candidateConfigurationSelected: lifecycle?.selectedConfigurationVersionId ?? null, authorities: { coverageApproved: bundle.coverageAuthority?.policy?.status === 'approved', outcomeApproved: bundle.outcomePolicyAuthority?.status === 'approved', empiricalApproved: bundle.empiricalAcceptancePolicyAuthority?.status === 'approved' }, rollbackEvidencePresent: !!checks[4], holdoutState: lifecycle?.state ?? 'missing', finalized: lifecycle?.state === 'completed', blockingReasonCodes: lifecycle?.failureReason ? [lifecycle.failureReason] : [] }, null, 2));
    } else if (operation === 'preflight') {
      await createService(bundle).preflight(input(bundle));
      console.log(JSON.stringify({ operation, ready: true, holdoutState: lifecycle?.state, confirmation: canonical({ runFamilyId: bundle.runFamilyId, datasetId: bundle.datasetId, configurationVersionId: bundle.configurationVersionId, holdoutPartitionHash: lifecycle?.holdoutPartitionHash }) }));
    } else if (operation === 'open-holdout') {
      if (!lifecycle || lifecycle.state !== 'selected') fail('holdout_not_selectable');
      await createService(bundle).preflight(input(bundle));
      const expected = canonical({ runFamilyId: bundle.runFamilyId, datasetId: bundle.datasetId, configurationVersionId: bundle.configurationVersionId, holdoutPartitionHash: lifecycle.holdoutPartitionHash });
      if (options.get('--confirm') !== expected) fail('holdout_confirmation_mismatch');
      await repository.openHoldout(bundle.runFamilyId, new Date().toISOString());
      console.log(JSON.stringify({ operation, runFamilyId: bundle.runFamilyId, state: 'opened' }));
    } else if (operation === 'evaluate') {
      if (lifecycle?.state !== 'opened') fail('holdout_not_opened');
      const run = await createService(bundle).run({ ...input(bundle), residualRisks: bundle.residualRisks ?? [], createdAt: new Date().toISOString(), holdoutAlreadyOpened: true });
      console.log(JSON.stringify({ operation, acceptanceRunId: run.acceptanceRunId, status: run.status }));
    } else {
      const runQuery = await pool.query("SELECT canonical_payload FROM intelligence_acceptance_records WHERE record_kind='acceptance_run' AND canonical_payload->>'acceptanceRunFamilyId'=$1", [bundle.runFamilyId]);
      const run = runQuery.rows[0]?.canonical_payload ?? null;
      const links = run ? await repository.listLinks(run.acceptanceRunId) : [];
      const body = { schemaVersion: 'ifp8-acceptance-evidence-export-v1', operatorVersion: VERSION, runFamilyId: bundle.runFamilyId, dataset: { id: bundle.datasetId, class: (await repository.get('dataset_manifest', bundle.datasetId))?.datasetClass }, holdout: lifecycle, acceptance: run ? { id: run.acceptanceRunId, status: run.status } : null, immutableReferenceLinks: links, generatedAt: new Date().toISOString() };
      const output = { ...body, overallEvidenceChecksum: canonical(body) };
      const target = options.get('--output'); if (target) await writeFile(target, JSON.stringify(output, null, 2) + '\n', { flag: 'wx' }); else console.log(JSON.stringify(output, null, 2));
    }
  }
} finally { await pool.end(); }
