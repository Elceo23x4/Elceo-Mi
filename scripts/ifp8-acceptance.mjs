#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const VERSION = 'ifp8-acceptance-operator-v1';
const EXPORT_VERSION = 'ifp8-acceptance-evidence-export-v1';
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
const allowedOptions = operation === 'import' ? new Set(['--bundle']) : operation === 'open-holdout' ? new Set(['--run-family', '--confirm']) : operation === 'export-evidence' ? new Set(['--run-family', '--output']) : new Set(['--run-family']);
if ([...options.keys()].some((key) => !allowedOptions.has(key))) fail('unsupported_argument');
if (operation === 'import' ? !options.get('--bundle') : !options.get('--run-family')) fail('required_option_missing');
if (operation === 'open-holdout' && !options.get('--confirm')) fail('required_option_missing');
if (!process.env.DATABASE_URL) fail('DATABASE_URL_required');
const { default: pg } = await import('pg');
const api = await import('../services/reasoning/dist-operator-cjs/services/reasoning/src/intelligence-acceptance/index.cjs');
const persistenceApi = await import('../services/reasoning/dist-operator-cjs/services/reasoning/src/persistence/index.cjs');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4 });
const repository = new api.SqlIntelligenceAcceptanceRepository(pool);
const canonical = (value) => api.canonicalHash(value);
const bodyOf = (value) => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'canonicalPayloadHash'));
const secretKey = /secret|password|credential|private.?key|api.?key|access.?token|refresh.?token/i;
const secretValue = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|(?:postgres|redis):\/\/[^\s:@]+:[^\s@]+@/i;
const assertNoSecrets = (value, path = '$') => {
  if (typeof value === 'string' && secretValue.test(value)) fail(`secret_value_forbidden:${path}`);
  if (Array.isArray(value)) return value.forEach((child, index) => assertNoSecrets(child, `${path}[${index}]`));
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    if (secretKey.test(key)) fail(`secret_field_forbidden:${path}.${key}`);
    assertNoSecrets(child, `${path}.${key}`);
  }
};
const validateBasicBundle = (value) => {
  if (!value || value.schemaVersion !== VERSION || !value.runFamilyId || !value.datasetId ||
      !value.configurationVersionId || !value.rollbackEvidenceId || !value.importedAt ||
      !Number.isFinite(Date.parse(value.importedAt)) || !Array.isArray(value.records))
    fail('invalid_input_bundle_contract');
  assertNoSecrets(value);
  if (!value.canonicalPayloadHash || value.canonicalPayloadHash !== canonical(bodyOf(value))) fail('input_bundle_hash_mismatch');
  return value;
};
const readBundle = async (path) => {
  let value; try { value = JSON.parse(await readFile(path, 'utf8')); } catch { fail('malformed_input_bundle'); }
  return validateBasicBundle(value);
};
const validateAndMinimizeImport = (bundle) => {
  const allowedKinds = new Set(['dataset_manifest', 'dataset_certification', 'split_manifest', 'configuration_version', 'calibration_trial', 'rollback_evidence', 'residual_risk']);
  for (const row of bundle.records) {
    if (!allowedKinds.has(row.kind) || !row.id || !row.value) fail('invalid_import_record');
    api.validateAcceptanceEntity(row.kind, row.id, row.value);
  }
  const record = (kind, id) => bundle.records.find((row) => row.kind === kind && row.id === id)?.value;
  const manifest = record('dataset_manifest', bundle.datasetId);
  const certification = record('dataset_certification', bundle.datasetId);
  if (!manifest) fail('operator_dataset_manifest_missing');
  if (!certification) fail('operator_dataset_certification_missing');
  if (api.verifyDatasetCertification(manifest, certification).length) fail('operator_dataset_certification_invalid');
  const artifacts = bundle.rawArtifacts;
  if (!Array.isArray(artifacts)) fail('raw_artifact_inventory_required');
  const allowedReferences = new Set([...certification.captureReplayProvenance, ...certification.certificationEvidenceReferences]);
  const verified = artifacts.map((artifact) => {
    if (!artifact || !artifact.contentBase64 || !artifact.contentHash || !artifact.certificationReference || !allowedReferences.has(artifact.certificationReference)) fail('raw_artifact_certification_reference_invalid');
    const decoded = Buffer.from(artifact.contentBase64, 'base64');
    if (secretValue.test(decoded.toString('utf8'))) fail('secret_value_forbidden:raw_artifact');
    const actual = createHash('sha256').update(decoded).digest('hex');
    if (actual !== artifact.contentHash) fail('raw_artifact_content_hash_mismatch');
    return { contentHash: actual, certificationReference: artifact.certificationReference };
  }).sort((a, b) => a.contentHash.localeCompare(b.contentHash));
  const hashes = verified.map((row) => row.contentHash);
  if (new Set(hashes).size !== hashes.length) fail('raw_artifact_duplicate_hash');
  const expected = [...manifest.rawArtifactHashes].sort();
  if (JSON.stringify(hashes) !== JSON.stringify(expected) || JSON.stringify(hashes) !== JSON.stringify([...certification.rawArtifactHashes].sort())) fail('raw_artifact_inventory_mismatch');
  const minimizedBody = { ...bodyOf(bundle), rawArtifacts: verified };
  return { ...minimizedBody, canonicalPayloadHash: canonical(minimizedBody) };
};
const loadBundle = async () => {
  const requested = options.get('--run-family');
  const q = await pool.query('SELECT acceptance_run_family_id,schema_version,canonical_payload,canonical_payload_hash FROM intelligence_acceptance_operator_bundles WHERE acceptance_run_family_id=$1', [requested]);
  const row = q.rows[0];
  if (!row) fail('operator_bundle_missing');
  try {
    const value = row.canonical_payload;
    if (row.schema_version !== VERSION || row.acceptance_run_family_id !== requested || value?.runFamilyId !== requested || value?.schemaVersion !== VERSION || !value?.canonicalPayloadHash || canonical(bodyOf(value)) !== value.canonicalPayloadHash || value.canonicalPayloadHash !== row.canonical_payload_hash) fail('operator_bundle_integrity_invalid');
    return validateBasicBundle(value);
  } catch (error) {
    if (error instanceof Error && error.message === 'operator_bundle_missing') throw error;
    fail('operator_bundle_integrity_invalid');
  }
};
const authorities = (bundle) => ({
  certification: { verify: async (certification, manifest) => !api.verifyDatasetCertification(manifest, certification).length },
  coverage: { resolve: async () => bundle.coverageAuthority?.policy ? { policy: bundle.coverageAuthority.policy, approvedStructuralDecisionIds: new Set(bundle.approvedStructuralDecisionIds ?? []) } : null },
  policies: { resolveOutcomePolicy: async () => bundle.outcomePolicyAuthority ?? null, resolveEmpiricalPolicy: async () => bundle.empiricalAcceptancePolicyAuthority ?? null },
});
const createService = (bundle) => {
  const authority = authorities(bundle), cases = bundle.decisionTimeCaseEvidence ?? [], outcomes = new Map((bundle.outcomeObservations ?? []).map((row) => [row.caseId, row.input]));
  return new api.IntelligenceAcceptanceService(repository,
    new api.ProductionIfpChainAdapter(persistenceApi.createReasoningPersistenceRepository(process.env), new api.CanonicalRuntimeBaselineAuthority()),
    { list: async (_dataset, ids) => ids.map((id) => cases.find((row) => row.eventInstanceId === id)).filter(Boolean), outcomeObservations: async (id) => outcomes.get(id) ?? null },
    authority.certification, authority.coverage, authority.policies);
};
const serviceInput = (bundle) => ({ runFamilyId: bundle.runFamilyId, datasetId: bundle.datasetId, configurationVersionId: bundle.configurationVersionId, rollbackEvidenceId: bundle.rollbackEvidenceId });
const confirmation = (bundle, lifecycle) => canonical({ runFamilyId: bundle.runFamilyId, datasetId: bundle.datasetId, configurationVersionId: bundle.configurationVersionId, holdoutPartitionHash: lifecycle.holdoutPartitionHash });
try {
  if (operation === 'import') {
    const bundle = validateAndMinimizeImport(await readBundle(options.get('--bundle')));
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query('SELECT canonical_payload_hash FROM intelligence_acceptance_operator_bundles WHERE acceptance_run_family_id=$1 FOR UPDATE', [bundle.runFamilyId]);
      if (found.rows[0] && found.rows[0].canonical_payload_hash !== bundle.canonicalPayloadHash) fail('immutable_operator_bundle_conflict');
      if (!found.rows[0]) await client.query('INSERT INTO intelligence_acceptance_operator_bundles VALUES($1,$2,$3,$4,$5)', [bundle.runFamilyId, VERSION, JSON.stringify(bundle), bundle.canonicalPayloadHash, new Date().toISOString()]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    for (const row of bundle.records) await repository.save(row.kind, row.id, row.value);
    console.log(JSON.stringify({ operation, runFamilyId: bundle.runFamilyId, imported: true, holdoutState: 'unselected' }));
  } else {
    const bundle = await loadBundle();
    let lifecycle = await repository.get('holdout_lifecycle', bundle.runFamilyId);
    if (operation === 'status') {
      const records = await Promise.all([repository.get('dataset_manifest', bundle.datasetId), repository.get('dataset_certification', bundle.datasetId), repository.get('split_manifest', bundle.datasetId), repository.get('configuration_version', bundle.configurationVersionId), repository.get('rollback_evidence', bundle.rollbackEvidenceId)]);
      console.log(JSON.stringify({ schemaVersion: VERSION, runFamilyId: bundle.runFamilyId, datasetPresent: !!records[0], certificationPresent: !!records[1], splitPresent: !!records[2], candidateConfigurationSelected: lifecycle?.selectedConfigurationVersionId ?? null, authorities: { coverageApproved: bundle.coverageAuthority?.policy?.status === 'approved', outcomeApproved: bundle.outcomePolicyAuthority?.status === 'approved', empiricalApproved: bundle.empiricalAcceptancePolicyAuthority?.status === 'approved' }, rollbackEvidencePresent: !!records[4], holdoutState: lifecycle?.state ?? 'unselected', finalized: lifecycle?.state === 'completed', blockingReasonCodes: lifecycle?.failureReason ? [lifecycle.failureReason] : [] }, null, 2));
    } else if (operation === 'preflight') {
      const service = createService(bundle), prerequisites = await service.preflightPrerequisites(serviceInput(bundle));
      lifecycle = await repository.freezeCandidate(api.createHoldoutLifecycle({ acceptanceRunFamilyId: bundle.runFamilyId, datasetId: bundle.datasetId, holdoutPartitionHash: prerequisites.split.holdoutPartitionHash, selectedConfigurationVersionId: bundle.configurationVersionId, selectedAt: new Date().toISOString() }));
      await service.preflight(serviceInput(bundle));
      console.log(JSON.stringify({ operation, ready: true, holdoutState: lifecycle.state, confirmation: confirmation(bundle, lifecycle) }));
    } else if (operation === 'open-holdout') {
      if (!lifecycle || lifecycle.state !== 'selected') fail('holdout_not_selectable');
      await createService(bundle).preflight(serviceInput(bundle));
      if (options.get('--confirm') !== confirmation(bundle, lifecycle)) fail('holdout_confirmation_mismatch');
      lifecycle = await repository.openHoldout(bundle.runFamilyId, new Date().toISOString());
      console.log(JSON.stringify({ operation, runFamilyId: bundle.runFamilyId, state: lifecycle.state }));
    } else if (operation === 'evaluate') {
      if (lifecycle?.state !== 'opened') fail('holdout_not_opened');
      const run = await createService(bundle).run({ ...serviceInput(bundle), residualRisks: bundle.residualRisks ?? [], createdAt: new Date().toISOString(), holdoutAlreadyOpened: true });
      console.log(JSON.stringify({ operation, acceptanceRunId: run.acceptanceRunId, status: run.state, productionAcceptance: run.productionAcceptance }));
    } else {
      const [manifest, certification, split, configuration, rollback] = await Promise.all([repository.get('dataset_manifest', bundle.datasetId), repository.get('dataset_certification', bundle.datasetId), repository.get('split_manifest', bundle.datasetId), repository.get('configuration_version', bundle.configurationVersionId), repository.get('rollback_evidence', bundle.rollbackEvidenceId)]);
      const trial = configuration?.sourceCalibrationRunId ? await repository.get('calibration_trial', configuration.sourceCalibrationRunId) : null;
      const runQuery = await pool.query("SELECT canonical_payload FROM intelligence_acceptance_records WHERE record_kind='acceptance_run' AND canonical_payload->>'acceptanceRunFamilyId'=$1", [bundle.runFamilyId]);
      const run = runQuery.rows[0]?.canonical_payload ?? null, links = run ? await repository.listLinks(run.acceptanceRunId) : [];
      const linked = async (kind) => Promise.all(links.filter((link) => link.kind === kind).map((link) => repository.get(kind, link.id)));
      const cases = await linked('case_result'), coverage = await linked('coverage_decision'), risks = await linked('residual_risk');
      const safePolicy = (policy) => policy ? { id: policy.coveragePolicyId ?? policy.policyId, canonicalPayloadHash: policy.canonicalPayloadHash, approvalReference: policy.approvalReference } : null;
      const body = { schemaVersion: EXPORT_VERSION, operatorVersion: VERSION, runFamilyId: bundle.runFamilyId,
        dataset: manifest ? { datasetId: manifest.datasetId, datasetVersion: manifest.datasetVersion, datasetClass: manifest.datasetClass, manifestCanonicalHash: manifest.canonicalPayloadHash } : null,
        certification: certification ? { certificationId: certification.certificationId, canonicalPayloadHash: certification.canonicalPayloadHash, certificationPolicyVersion: certification.certificationPolicyVersion, evidenceReferences: certification.certificationEvidenceReferences } : null,
        split: split ? { splitId: split.splitId, calibrationPartitionHash: split.calibrationPartitionHash, embargoPartitionHash: split.embargoPartitionHash, holdoutPartitionHash: split.holdoutPartitionHash } : null,
        configuration: configuration ? { configurationVersionId: configuration.configurationVersionId, canonicalPayloadHash: configuration.canonicalPayloadHash, parameterSnapshotHash: configuration.parameterSnapshotHash, changeClass: configuration.changeClass, calibrationTrialReference: trial?.trialId ?? null } : null,
        policyAuthorities: { coverage: safePolicy(bundle.coverageAuthority?.policy), outcome: safePolicy(bundle.outcomePolicyAuthority), empirical: safePolicy(bundle.empiricalAcceptancePolicyAuthority) },
        holdout: lifecycle ? { state: lifecycle.state, selectedAt: lifecycle.selectedAt, openedAt: lifecycle.openedAt, completedAt: lifecycle.completedAt, failureReason: lifecycle.failureReason, canonicalPayloadHash: lifecycle.canonicalPayloadHash } : null,
        acceptance: run ? { acceptanceRunId: run.acceptanceRunId, state: run.state, status: run.state, productionAcceptance: run.productionAcceptance, evidenceIntegrityGate: run.evidenceIntegrityGate, mandatoryCoverageGate: run.mandatoryCoverageGate, empiricalIntelligenceGate: run.empiricalIntelligenceGate, reasonCodes: run.reasonCodes, canonicalPayloadHash: run.canonicalPayloadHash } : null,
        caseResults: cases.filter(Boolean).map((row) => ({ id: row.caseResultId, canonicalPayloadHash: row.canonicalPayloadHash })),
        coverageDecisions: coverage.filter(Boolean).map((row) => ({ id: row.coverageDecisionId, state: row.state, canonicalPayloadHash: row.canonicalPayloadHash })),
        residualRisks: risks.filter(Boolean).map((row) => ({ id: row.riskId, severity: row.severity, blocksAcceptance: row.blocksAcceptance, resolutionState: row.resolutionState, canonicalPayloadHash: row.canonicalPayloadHash })),
        rollback: rollback ? { rollbackEvidenceId: rollback.rollbackEvidenceId, reproductionMatch: rollback.reproductionMatch, canonicalPayloadHash: rollback.canonicalPayloadHash } : null,
        immutableReferenceLinks: links, generatedAt: new Date().toISOString() };
      const output = { ...body, overallEvidenceChecksum: canonical(body) };
      const target = options.get('--output'); if (target) await writeFile(target, JSON.stringify(output, null, 2) + '\n', { flag: 'wx' }); else console.log(JSON.stringify(output, null, 2));
    }
  }
} finally { await pool.end(); }
