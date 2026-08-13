import { canonicalJson } from '../expectation-reality/identity';
import type {
  AcceptanceBundle,
  AcceptanceEntityMap,
  AcceptanceRecordKind,
} from './contracts';

type Resolver = <K extends AcceptanceRecordKind>(
  kind: K,
  id: string,
) => Promise<AcceptanceEntityMap[K] | null>;

const ordered = <T extends { [key: string]: unknown }>(rows: readonly T[], key: keyof T) =>
  [...rows].sort((a, b) => String(a[key]).localeCompare(String(b[key])));

export async function validateAcceptanceBundleCoherence(
  runFamilyId: string,
  bundle: AcceptanceBundle,
  resolve: Resolver,
): Promise<void> {
  const fail = () => {
    throw new Error('acceptance_bundle_coherence_mismatch');
  };
  if (
    bundle.run.acceptanceRunFamilyId !== runFamilyId ||
    bundle.run.rollbackEvidenceId !== bundle.rollback.rollbackEvidenceId
  )
    fail();
  const caseHashes = bundle.cases.map((row) => row.canonicalPayloadHash).sort();
  if (
    new Set(caseHashes).size !== caseHashes.length ||
    canonicalJson(caseHashes) !== canonicalJson([...bundle.run.caseResultHashes].sort()) ||
    canonicalJson(ordered(bundle.run.coverageDecisions, 'coverageDecisionId')) !==
      canonicalJson(ordered(bundle.coverage, 'coverageDecisionId')) ||
    canonicalJson(ordered(bundle.run.residualRisks, 'riskId')) !==
      canonicalJson(ordered(bundle.risks, 'riskId'))
  )
    fail();
  const configuration = await resolve('configuration_version', bundle.run.configurationVersionId);
  if (!configuration) fail();
  const expected = [
    { kind: 'dataset_manifest' as const, id: bundle.run.datasetId },
    { kind: 'configuration_version' as const, id: bundle.run.configurationVersionId },
    { kind: 'rollback_evidence' as const, id: bundle.rollback.rollbackEvidenceId },
    ...(bundle.run.splitId
      ? [{ kind: 'split_manifest' as const, id: bundle.run.datasetId }]
      : []),
    ...(bundle.run.certificationId
      ? [{ kind: 'dataset_certification' as const, id: bundle.run.datasetId }]
      : []),
    ...(configuration?.sourceCalibrationRunId
      ? [{ kind: 'calibration_trial' as const, id: configuration.sourceCalibrationRunId }]
      : []),
    ...bundle.cases.map((row) => ({ kind: 'case_result' as const, id: row.caseResultId })),
    ...bundle.coverage.map((row) => ({
      kind: 'coverage_decision' as const,
      id: row.coverageDecisionId,
    })),
    ...bundle.risks.map((row) => ({ kind: 'residual_risk' as const, id: row.riskId })),
  ].sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
  const actual = [...bundle.referenceLinks].sort(
    (a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id),
  );
  if (
    new Set(actual.map((row) => `${row.kind}:${row.id}`)).size !== actual.length ||
    canonicalJson(actual) !== canonicalJson(expected)
  )
    fail();
  if (!(await resolve('dataset_manifest', bundle.run.datasetId))) fail();
  if (bundle.run.splitId) {
    const split = await resolve('split_manifest', bundle.run.datasetId);
    if (!split || split.splitId !== bundle.run.splitId) fail();
  }
  if (bundle.run.certificationId) {
    const certification = await resolve('dataset_certification', bundle.run.datasetId);
    if (!certification || certification.certificationId !== bundle.run.certificationId) fail();
  }
}
