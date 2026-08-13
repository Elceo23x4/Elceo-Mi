import type {
  DatasetCertification,
  DatasetClass,
  DatasetManifest,
  DecisionTimeEvidence,
} from './contracts';
import { DATASET_CERTIFICATION_POLICY_VERSION } from './contracts';
import { canonicalHash, canonicalJson } from './identity';

const empirical = new Set<DatasetClass>([
  'certified_replay',
  'staging_capture',
  'production_like_certified',
]);
const sorted = (values: readonly string[]) => [...new Set(values)].sort();

export function finalizeDatasetManifest(
  draft: Omit<DatasetManifest, 'canonicalPayloadHash'>,
): DatasetManifest {
  const { canonicalPayloadHash: ignored, ...domainDraft } = draft as DatasetManifest;
  void ignored;
  const body = {
    ...domainDraft,
    sourceIds: sorted(domainDraft.sourceIds),
    assetCoverage: sorted(domainDraft.assetCoverage),
    eventClassCoverage: sorted(domainDraft.eventClassCoverage),
    horizonCoverage: sorted(domainDraft.horizonCoverage),
    rawArtifactHashes: sorted(domainDraft.rawArtifactHashes),
  };
  return Object.freeze({ ...body, canonicalPayloadHash: canonicalHash(body) });
}

export function finalizeCertification(
  draft: Omit<
    DatasetCertification,
    'certificationId' | 'certificationPolicyVersion' | 'canonicalPayloadHash'
  >,
): DatasetCertification {
  const body = {
    ...draft,
    rawArtifactHashes: sorted(draft.rawArtifactHashes),
    captureReplayProvenance: sorted(draft.captureReplayProvenance),
    sourceIds: sorted(draft.sourceIds),
    certificationEvidenceReferences: sorted(draft.certificationEvidenceReferences),
    certificationPolicyVersion: DATASET_CERTIFICATION_POLICY_VERSION,
  };
  const hash = canonicalHash(body);
  return Object.freeze({
    ...body,
    certificationId: `ifp8-cert-${hash.slice(0, 32)}`,
    canonicalPayloadHash: hash,
  });
}

export function verifyDatasetCertification(
  manifest: DatasetManifest,
  certification: DatasetCertification | null,
): string[] {
  const reasons: string[] = [];
  if (!certification) return ['blocked_missing_certified_evidence'];
  if (
    certification.datasetId !== manifest.datasetId ||
    certification.datasetVersion !== manifest.datasetVersion ||
    certification.datasetManifestHash !== manifest.canonicalPayloadHash
  )
    reasons.push('dataset_certification_manifest_mismatch');
  if (
    certification.claimedDatasetClass !== manifest.datasetClass ||
    !empirical.has(manifest.datasetClass)
  )
    reasons.push('dataset_class_not_empirically_qualified');
  if (
    certification.sourceRegistryHash !== manifest.sourceRegistryHash ||
    certification.sourceRegistryVersion !== manifest.sourceRegistryVersion
  )
    reasons.push('dataset_certification_registry_mismatch');
  if (
    canonicalJson(certification.rawArtifactHashes) !==
      canonicalJson(sorted(manifest.rawArtifactHashes)) ||
    canonicalJson(certification.sourceIds) !== canonicalJson(sorted(manifest.sourceIds))
  )
    reasons.push('dataset_certification_artifact_mismatch');
  if (certification.fixtureContamination || certification.unverifiedContamination)
    reasons.push('dataset_certification_contaminated');
  if (
    !certification.captureReplayProvenance.length ||
    !certification.certificationEvidenceReferences.length
  )
    reasons.push('dataset_certification_evidence_missing');
  return [...new Set(reasons)].sort();
}

export function validateDecisionTimeEvidence(evidence: DecisionTimeEvidence): DecisionTimeEvidence {
  if (evidence.evidenceCutoffAt !== evidence.productionInput.evidenceCutoffAt)
    throw new Error('decision_time_cutoff_mismatch');
  for (const reference of evidence.references) {
    if (!reference.availableAt || !Number.isFinite(Date.parse(reference.availableAt)))
      throw new Error('missing_or_invalid_available_at');
    if (Date.parse(reference.availableAt) > Date.parse(evidence.evidenceCutoffAt))
      throw new Error('future_evidence_rejected');
  }
  return evidence;
}
