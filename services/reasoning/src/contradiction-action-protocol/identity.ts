import { canonicalHash, canonicalJson } from '../expectation-reality/identity';
import { CONTRADICTION_ACTION_PROTOCOL_POLICY_VERSION } from './policy';
import type { EvidenceReference, ProtocolAuditRecord, ProtocolEvidenceBundle, SupersessionLink } from './contracts';
import type { MarketContradictionInput } from '@elceo/types';
export { canonicalHash, canonicalJson };

const strings = <T extends string>(values: readonly T[]): T[] => [...new Set(values)].sort();
const byCanonicalContent = <T>(values: readonly T[]): T[] => [...values].sort((left, right) => canonicalHash(left).localeCompare(canonicalHash(right)));

export function normalizedContradiction<T>(value: T): T {
  const matrix = value as ProtocolEvidenceBundle['contradictionMatrix'];
  const normalized = {
    ...matrix,
    warnings: strings(matrix.warnings),
    reasonCodes: strings(matrix.reasonCodes),
    evidencePoints: byCanonicalContent(matrix.evidencePoints.map((point) => ({ ...point, warnings: strings(point.warnings), reasonCodes: strings(point.reasonCodes) }))),
    signals: byCanonicalContent(matrix.signals.map((signal) => ({ ...signal, warnings: strings(signal.warnings), reasonCodes: strings(signal.reasonCodes), evidencePointIds: strings(signal.evidencePointIds) }))),
  };
  return { ...normalized, resultId: `protocol-matrix:${canonicalHash({ ...normalized, resultId: undefined })}` } as T;
}

export function normalizeContradictionInput(input: MarketContradictionInput): MarketContradictionInput {
  return { ...input, warnings: strings(input.warnings), evidencePoints: byCanonicalContent(input.evidencePoints.map((point) => ({ ...point, warnings: strings(point.warnings), reasonCodes: strings(point.reasonCodes) }))) };
}

export function protocolEvidenceSnapshotId(bundle: ProtocolEvidenceBundle): string {
  return `cap-evidence:${canonicalHash({ eventEvaluationId: bundle.eventEvaluation.eventEvaluationId, assessmentEvidenceHash: bundle.eventEvaluation.assessmentEvidenceHash, expectationId: bundle.expectation.expectationId, contradictionInputRecordId: bundle.persistedContradictionInput.recordId, contradictionInputHash: canonicalHash(normalizeContradictionInput(bundle.contradictionInput)), contradictionHash: canonicalHash(normalizedContradiction(bundle.contradictionMatrix)), invalidationHash: canonicalHash(bundle.invalidationState), cognitionSnapshotIds: strings([bundle.preEventCognition.persisted.snapshotId, ...(bundle.postEventCognition ? [bundle.postEventCognition.persisted.snapshotId] : [])]), analogRetrievalId: bundle.analogRetrieval?.retrievalId ?? null, analogQueryFeatureHash: bundle.analogRetrieval?.queryFeatureHash ?? null })}`;
}

export function protocolDecisionId(input: { bundle: ProtocolEvidenceBundle; evidenceCutoffAt: string; previousProtocolDecisionId?: string | null }): string {
  if (!Number.isFinite(Date.parse(input.evidenceCutoffAt))) throw new Error('invalid_evidence_cutoff_timestamp');
  return `cap-decision:${canonicalHash({ policyVersion: CONTRADICTION_ACTION_PROTOCOL_POLICY_VERSION, eventEvaluationId: input.bundle.eventEvaluation.eventEvaluationId, assessmentEvidenceHash: input.bundle.eventEvaluation.assessmentEvidenceHash, expectationId: input.bundle.expectation.expectationId, cognitionSnapshotIds: strings([input.bundle.preEventCognition.persisted.snapshotId, ...(input.bundle.postEventCognition ? [input.bundle.postEventCognition.persisted.snapshotId] : [])]), contradictionInputRecordId: input.bundle.persistedContradictionInput.recordId, contradictionInputHash: canonicalHash(normalizeContradictionInput(input.bundle.contradictionInput)), contradictionEvidenceHash: canonicalHash(normalizedContradiction(input.bundle.contradictionMatrix)), invalidationStateHash: canonicalHash(input.bundle.invalidationState), analogRetrievalId: input.bundle.analogRetrieval?.retrievalId ?? null, analogQueryFeatureHash: input.bundle.analogRetrieval?.queryFeatureHash ?? null, evidenceCutoffAt: input.evidenceCutoffAt, previousProtocolDecisionId: input.previousProtocolDecisionId ?? null })}`;
}

export function transitionId(previousProtocolDecisionId: string, nextProtocolDecisionId: string): string {
  return `cap-transition:${canonicalHash({ previousProtocolDecisionId, nextProtocolDecisionId })}`;
}

const normalizeReferences = (references: EvidenceReference[]): EvidenceReference[] => byCanonicalContent(references);
const normalizeRecord = <T extends Omit<ProtocolAuditRecord, 'canonicalPayloadHash'>>(record: T): T => ({
  ...record,
  sourceCognitionSnapshotIds: strings(record.sourceCognitionSnapshotIds),
  transitionReasons: strings(record.transitionReasons),
  blockedActionClasses: strings(record.blockedActionClasses),
  warnings: strings(record.warnings),
  limitations: strings(record.limitations),
  sourceEvidenceReferences: normalizeReferences(record.sourceEvidenceReferences),
  contradictionEvidence: { ...record.contradictionEvidence, families: strings(record.contradictionEvidence.families), warnings: strings(record.contradictionEvidence.warnings), reasonCodes: strings(record.contradictionEvidence.reasonCodes) },
  analogContext: { ...record.analogContext, limitations: strings(record.analogContext.limitations), warnings: strings(record.analogContext.warnings) },
  provenance: { ...record.provenance, reliability: strings(record.provenance.reliability), limitations: strings(record.provenance.limitations) },
}) as T;

export const payloadHash = Object.assign(
  (record: Omit<ProtocolAuditRecord, 'canonicalPayloadHash'>): string => canonicalHash(normalizeRecord(record)),
  { normalize: normalizeRecord, normalizeReferences },
);

export function makeSupersession(previousProtocolDecisionId: string, nextProtocolDecisionId: string): SupersessionLink {
  return { previousProtocolDecisionId, transitionId: transitionId(previousProtocolDecisionId, nextProtocolDecisionId), supersedes: true };
}
