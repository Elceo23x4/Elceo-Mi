import type { CanonicalCognitionState } from '@elceo/types';
import { evaluateMarketContradictionMatrix } from '../contradiction-matrix/index';
import type { EventExpectationRepository, EventRealityRepository } from '../expectation-reality/repository';
import { canonicalHash } from '../expectation-reality/identity';
import type { SourceProvenance } from '../expectation-reality/contracts';
import type { HistoricalAnalogRepository } from '../historical-analog-memory/contracts';
import type { CognitionSnapshotRepository, PersistedCognitionSnapshot } from '../persistence/contracts';
import { deserializeCanonicalCognitionState } from '../persistence/serialization';
import { BLOCKED_ACTION_CLASSES, CONTRADICTION_ACTION_PROTOCOL_POLICY_VERSION, reviewPromptForState, validateNoAdviceRecord } from './policy';
import { makeSupersession, normalizeContradictionInput, normalizedContradiction, payloadHash, protocolDecisionId, protocolEvidenceSnapshotId } from './identity';
import { assessmentStageOrder, decideProtocolState } from './state-machine';
import type { ContradictionActionProtocolRepository } from './repository';
import type { EvidenceReference, EvidenceReliability, ProtocolAuditRecord, ProtocolDecisionRequest, ProtocolEvidenceBundle } from './contracts';
import type { PersistedContradictionInputRepository } from './input-repository';
import type { ReasoningPersistenceRepository } from '../persistence/contracts';

export type ProtocolEvidenceLoaders = {
  eventRealityRepository: EventRealityRepository;
  eventExpectationRepository: EventExpectationRepository;
  cognitionSnapshotRepository: CognitionSnapshotRepository;
  contradictionInputRepository: PersistedContradictionInputRepository;
  analogRepository?: HistoricalAnalogRepository;
  protocolRepository: ContradictionActionProtocolRepository;
};

const parseIso = (value: string, label: string): number => {
  const parsed = Date.parse(value);
  if (!value || !Number.isFinite(parsed)) throw new Error(`invalid_${label}_timestamp`);
  return parsed;
};
const sortedUnique = <T extends string>(values: T[]): T[] => [...new Set(values)].sort();
const effectiveReliability = (source: SourceProvenance): EvidenceReliability => {
  const reliability = source.effectiveReliability ?? source.reliability;
  if (reliability === 'replay' && (!source.verificationRef || !source.verifiedAt)) return 'unverified';
  return reliability;
};
const envelopeReliability = (source: { reliability: EvidenceReliability; effectiveReliability?: EvidenceReliability; verificationRef?: string | null; verifiedAt?: string | null }): EvidenceReliability => {
  const reliability = source.effectiveReliability ?? source.reliability;
  if (reliability === 'replay' && (!source.verificationRef || !source.verifiedAt)) return 'unverified';
  return reliability;
};

function validateCognitionSnapshot(snapshot: PersistedCognitionSnapshot, expectedId: string, asset: string, cutoff: number): CanonicalCognitionState {
  if (snapshot.snapshotId !== expectedId) throw new Error('cognition_snapshot_identity_mismatch');
  if (snapshot.asset !== asset) throw new Error('cognition_snapshot_asset_mismatch');
  if (parseIso(snapshot.evaluatedAt, 'cognition_evaluated_at') > cutoff || parseIso(snapshot.createdAt, 'cognition_created_at') > cutoff) throw new Error('cognition_evidence_after_protocol_cutoff');
  const cognition = deserializeCanonicalCognitionState(snapshot.cognitionJson);
  if (cognition.asset !== snapshot.asset || cognition.timeframe !== snapshot.timeframe || cognition.evaluatedAt !== snapshot.evaluatedAt) throw new Error('canonical_cognition_metadata_mismatch');
  if (cognition.audit.reasoningVersion !== snapshot.reasoningVersion || cognition.audit.scoringVersion !== snapshot.scoringVersion) throw new Error('canonical_cognition_reasoning_identity_mismatch');
  if (parseIso(cognition.audit.dataCutoffAt, 'cognition_data_cutoff') > cutoff) throw new Error('cognition_data_after_protocol_cutoff');
  return cognition;
}

export class ContradictionActionProtocolService {
  constructor(private readonly deps: ProtocolEvidenceLoaders) {}

  async decide(request: ProtocolDecisionRequest): Promise<ProtocolAuditRecord> {
    const cutoff = parseIso(request.evidenceCutoffAt, 'evidence_cutoff');
    const evaluation = await this.deps.eventRealityRepository.getEventEvaluationById(request.eventEvaluationId);
    if (!evaluation) throw new Error('event_evaluation_not_found');
    const expectation = await this.deps.eventExpectationRepository.getEventExpectationById(evaluation.expectationId);
    if (!expectation) throw new Error('event_expectation_not_found');
    if (expectation.expectationId !== evaluation.expectationId || expectation.asset !== evaluation.asset || expectation.eventReleaseId !== evaluation.releaseId) throw new Error('mismatched_event_expectation_identity');
    if (expectation.preEventCognitionSnapshotId !== evaluation.preEventCognitionSnapshotId) throw new Error('pre_event_cognition_identity_mismatch');
    if (parseIso(evaluation.interpretedAt, 'event_interpreted_at') > cutoff || parseIso(evaluation.createdAt, 'event_created_at') > cutoff) throw new Error('evidence_after_protocol_cutoff');
    if (!evaluation.assessmentEvidenceHash || !evaluation.observationContentHash) throw new Error('missing_content_hash');

    const prePersisted = await this.deps.cognitionSnapshotRepository.getSnapshotById(evaluation.preEventCognitionSnapshotId);
    if (!prePersisted) throw new Error('pre_event_cognition_snapshot_not_found');
    const preCognition = validateCognitionSnapshot(prePersisted, evaluation.preEventCognitionSnapshotId, evaluation.asset, cutoff);
    const expectationCutoff=parseIso(expectation.dataCutoffAt,'expectation_data_cutoff');
    const issuedAt=parseIso(expectation.issuedAt,'expectation_issued_at');
    const releaseAt=parseIso(expectation.scheduledReleaseTime,'scheduled_release');
    const preEvaluated=parseIso(prePersisted.evaluatedAt,'pre_cognition_evaluated_at');
    if(preEvaluated>expectationCutoff || preEvaluated>issuedAt || preEvaluated>=releaseAt) throw new Error('pre_event_cognition_temporal_leakage');
    if(parseIso(preCognition.audit.dataCutoffAt,'pre_cognition_data_cutoff')>expectationCutoff) throw new Error('pre_event_cognition_future_data_cutoff');
    const postPersisted = evaluation.postEventCognitionSnapshotId ? await this.deps.cognitionSnapshotRepository.getSnapshotById(evaluation.postEventCognitionSnapshotId) : null;
    if (evaluation.postEventCognitionSnapshotId && !postPersisted) throw new Error('post_event_cognition_snapshot_not_found');
    const postCognition = postPersisted ? validateCognitionSnapshot(postPersisted, evaluation.postEventCognitionSnapshotId!, evaluation.asset, cutoff) : null;
    if (postPersisted && (parseIso(postPersisted.evaluatedAt, 'post_cognition_evaluated_at') < parseIso(evaluation.reality.observedAt, 'release_observed_at') || parseIso(postPersisted.evaluatedAt, 'post_cognition_evaluated_at') > parseIso(evaluation.interpretedAt, 'event_interpreted_at'))) throw new Error('post_event_cognition_time_mismatch');

    const persistedContradictionInput = await this.deps.contradictionInputRepository.getContradictionInputForEvent(evaluation.eventEvaluationId);
    if(!persistedContradictionInput) throw new Error('persisted_contradiction_input_not_found');
    if(persistedContradictionInput.eventEvaluationId!==evaluation.eventEvaluationId || persistedContradictionInput.expectationId!==expectation.expectationId || persistedContradictionInput.asset!==evaluation.asset || persistedContradictionInput.assessmentStage!==evaluation.assessmentStage || persistedContradictionInput.assessmentEvidenceHash!==evaluation.assessmentEvidenceHash) throw new Error('persisted_contradiction_input_lineage_mismatch');
    if(parseIso(persistedContradictionInput.availableAt,'contradiction_input_available_at')>cutoff || parseIso(persistedContradictionInput.createdAt,'contradiction_input_created_at')>cutoff || parseIso(persistedContradictionInput.evidenceCutoffAt,'contradiction_input_evidence_cutoff')>cutoff) throw new Error('contradiction_input_after_protocol_cutoff');
    const contradictionInput = persistedContradictionInput.input;
    if(canonicalHash(normalizeContradictionInput(contradictionInput))!==persistedContradictionInput.normalizedInputHash) throw new Error('contradiction_input_hash_mismatch');
    if(persistedContradictionInput.providerReliabilitySupplied!==contradictionInput.providerReliabilitySupplied || persistedContradictionInput.sourceIndependenceVerified!==contradictionInput.sourceIndependenceVerified) throw new Error('contradiction_input_trust_flag_mismatch');
    if (contradictionInput.asset !== evaluation.asset) throw new Error('contradiction_input_asset_mismatch');
    if (parseIso(contradictionInput.generatedAt, 'contradiction_generated_at') > cutoff) throw new Error('contradiction_input_after_protocol_cutoff');
    for (const point of contradictionInput.evidencePoints) {
      if (!point.evidencePointId || !point.sourceId) throw new Error('contradiction_evidence_identity_missing');
      const provenance=persistedContradictionInput.provenance.filter((source)=>source.sourceId===point.sourceId);
      if(provenance.length!==1) throw new Error('contradiction_evidence_provenance_missing');
      if (parseIso(point.observedAt, 'contradiction_evidence_observed_at') > cutoff) throw new Error('contradiction_evidence_after_protocol_cutoff');
    }
    if(contradictionInput.evidencePoints.length && !persistedContradictionInput.provenance.length) throw new Error('contradiction_evidence_provenance_missing');
    const provenanceIds=new Set(persistedContradictionInput.provenance.map((source)=>source.sourceId));
    if(provenanceIds.size!==persistedContradictionInput.provenance.length) throw new Error('contradiction_evidence_duplicate_provenance');
    const pointIds=new Set(contradictionInput.evidencePoints.map((point)=>point.sourceId));
    if(persistedContradictionInput.sourceEvidenceIds.some((id)=>!pointIds.has(id)&&!provenanceIds.has(id))) throw new Error('contradiction_source_evidence_unresolved');
    for(const source of persistedContradictionInput.provenance) if(source.reliability==='replay'&&(!source.verificationRef||!source.verifiedAt||parseIso(source.verifiedAt,'contradiction_replay_verified_at')>cutoff)) throw new Error('contradiction_replay_verification_invalid');
    const matrix = evaluateMarketContradictionMatrix(contradictionInput);

    const analog = request.analogRetrievalId && this.deps.analogRepository ? await this.deps.analogRepository.getRetrievalById(request.analogRetrievalId) : null;
    if (request.analogRetrievalId && !analog) throw new Error('analog_retrieval_not_found');
    if (analog) {
      if (analog.queryEventEvaluationId !== evaluation.eventEvaluationId) throw new Error('cross_event_analog_retrieval_mismatch');
      if (parseIso(analog.createdAt, 'analog_created_at') > cutoff || parseIso(analog.queryCutoffAt, 'analog_query_cutoff') > cutoff) throw new Error('analog_evidence_after_protocol_cutoff');
      if (analog.memorySnapshot.some((snapshot) => snapshot.selectedStageAssessmentStageOrder > assessmentStageOrder(evaluation.assessmentStage))) throw new Error('future_stage_evidence_rejected');
    }

    const reliability = [
      ...expectation.provenance.map(effectiveReliability),
      ...evaluation.reality.provenance.map(effectiveReliability),
      ...evaluation.reactionProvenance.map(envelopeReliability),
      ...persistedContradictionInput.provenance.map((source)=>source.reliability==='replay'&&(!source.verificationRef||!source.verifiedAt)?'unverified':source.reliability),
    ];
    const bundle: ProtocolEvidenceBundle = { eventEvaluation: evaluation, expectation, analogRetrieval: analog, preEventCognition: { persisted: prePersisted, cognition: preCognition }, postEventCognition: postPersisted && postCognition ? { persisted: postPersisted, cognition: postCognition } : null, persistedContradictionInput, contradictionInput, contradictionMatrix: matrix, invalidationState: (postCognition ?? preCognition).invalidation, requiredDirectReliability: reliability };

    const prior = request.previousProtocolDecisionId ? await this.deps.protocolRepository.getProtocolRecordById(request.previousProtocolDecisionId) : null;
    if (request.previousProtocolDecisionId && !prior) throw new Error('previous_protocol_decision_missing');
    const eventInstanceKey = canonicalHash({ expectationId: expectation.expectationId, releaseId: evaluation.releaseId, releaseVersion: evaluation.releaseVersion, asset: evaluation.asset });
    if (prior && (prior.sourceExpectationId !== expectation.expectationId || prior.sourceReleaseId !== evaluation.releaseId || prior.sourceReleaseVersion !== evaluation.releaseVersion || prior.sourceAsset !== evaluation.asset || prior.eventInstanceKey !== eventInstanceKey)) throw new Error('cross_event_supersession_rejected');
    if (prior && assessmentStageOrder(evaluation.assessmentStage) < prior.sourceAssessmentStageOrder) throw new Error('evidence_stage_regression');

    const decision = decideProtocolState(bundle);
    const cognitionIds = sortedUnique([evaluation.preEventCognitionSnapshotId, ...(evaluation.postEventCognitionSnapshotId ? [evaluation.postEventCognitionSnapshotId] : [])]);
    const analogHash = analog ? canonicalHash({ retrievalId: analog.retrievalId, queryFeatureHash: analog.queryFeatureHash, evidenceSufficiency: analog.evidenceSufficiency, warnings: sortedUnique(analog.warnings), limitations: sortedUnique(analog.limitations) }) : null;
    const id = protocolDecisionId({ bundle, evidenceCutoffAt: request.evidenceCutoffAt, previousProtocolDecisionId: request.previousProtocolDecisionId ?? null });
    const refs = this.buildReferences(bundle, reliability);
    const counts = (kind: EvidenceReliability) => refs.filter((ref) => ref.reliability === kind).length;
    const provenanceLimitations = sortedUnique([
      ...(counts('fixture') ? ['fixture_evidence_non_production'] : []),
      ...(counts('unverified') ? ['unverified_required_direct_evidence'] : []),
    ]);
    const warnings = sortedUnique([...decision.warnings, ...provenanceLimitations]);
    const limitations = sortedUnique([...decision.limitations, ...provenanceLimitations, ...(analog && analog.evidenceSufficiency !== 'sufficient' ? [`analog_${analog.evidenceSufficiency}`] : [])]);
    const inputHash = canonicalHash(normalizeContradictionInput(contradictionInput));
    const matrixHash = canonicalHash(normalizedContradiction(matrix));
    const invalidationHash = canonicalHash(bundle.invalidationState);
    const noHash: Omit<ProtocolAuditRecord, 'canonicalPayloadHash'> = {
      protocolDecisionId: id, policyVersion: CONTRADICTION_ACTION_PROTOCOL_POLICY_VERSION, sourceEventEvaluationId: evaluation.eventEvaluationId, sourceExpectationId: expectation.expectationId, sourceContradictionInputId:persistedContradictionInput.recordId, sourceAnalogRetrievalId: analog?.retrievalId ?? null, sourceCognitionSnapshotIds: cognitionIds,
      sourceAsset: evaluation.asset, sourceReleaseId: evaluation.releaseId, sourceReleaseVersion: evaluation.releaseVersion, sourceAssessmentStage: evaluation.assessmentStage, sourceAssessmentStageOrder: assessmentStageOrder(evaluation.assessmentStage), eventInstanceKey,
      contradictionEvidenceHash: matrixHash, invalidationStateHash: invalidationHash, analogContextHash: analogHash, evidenceCutoffAt: request.evidenceCutoffAt, evidenceSufficiency: decision.sufficiency, protocolState: decision.state, transitionReasons: sortedUnique(decision.reasons), reviewPrompts: [reviewPromptForState(decision.state)], blockedActionClasses: sortedUnique([...BLOCKED_ACTION_CLASSES]), warnings, limitations, deterministicRationale: decision.rationale, sourceEvidenceReferences: refs,
      contradictionEvidence: { evidenceSnapshotId: protocolEvidenceSnapshotId(bundle), inputHash, matrixResultHash: matrixHash, severity: matrix.highestSeverity, status: matrix.status, score: evaluation.reality.postEventContradiction, families: sortedUnique(matrix.signals.map((signal) => signal.family)), warnings: sortedUnique(matrix.warnings), reasonCodes: sortedUnique(matrix.reasonCodes) },
      invalidationEvidence: { invalidationStateHash: invalidationHash, confirmed: bundle.invalidationState.primary?.confirmed === true && bundle.invalidationState.riskLabel === 'broken', canonicalConditions: bundle.invalidationState.primary?.confirmed === true && bundle.invalidationState.riskLabel === 'broken' ? ['primary_present', 'primary_confirmed', 'risk_label_broken'] : [], state: bundle.invalidationState },
      analogContext: { absent: !analog, analogContextHash: analogHash, retrievalId: analog?.retrievalId ?? null, queryFeatureHash: analog?.queryFeatureHash ?? null, evidenceSufficiency: analog?.evidenceSufficiency ?? null, limitations: sortedUnique(analog?.limitations ?? []), warnings: sortedUnique(analog?.warnings ?? []), outcomeContextAttachedAfterSelection: Boolean(analog) },
      provenance: { reliability: sortedUnique(refs.map((ref) => ref.reliability)), verifiedSourceCount: counts('verified'), replaySourceCount: counts('replay'), fixtureSourceCount: counts('fixture'), unverifiedSourceCount: counts('unverified'), limitations: provenanceLimitations },
      previousDecision: request.previousProtocolDecisionId ? makeSupersession(request.previousProtocolDecisionId, id) : null, createdAt: evaluation.interpretedAt,
    };
    const normalized = payloadHash.normalize(noHash);
    const record = { ...normalized, canonicalPayloadHash: payloadHash(normalized) } as ProtocolAuditRecord;
    validateNoAdviceRecord(record);
    return this.deps.protocolRepository.saveProtocolRecord(record);
  }

  private buildReferences(bundle: ProtocolEvidenceBundle, reliability: EvidenceReliability[]): EvidenceReference[] {
    const fallback = reliability.includes('unverified') ? 'unverified' : reliability.includes('fixture') ? 'fixture' : reliability.includes('replay') ? 'replay' : 'verified';
    const refs: EvidenceReference[] = [
      { sourceType: 'event_evaluation', sourceId: bundle.eventEvaluation.eventEvaluationId, contentHash: bundle.eventEvaluation.assessmentEvidenceHash, observedAt: bundle.eventEvaluation.interpretedAt, reliability: fallback },
      { sourceType: 'event_expectation', sourceId: bundle.expectation.expectationId, contentHash: canonicalHash(bundle.expectation), observedAt: bundle.expectation.createdAt, reliability: fallback },
      { sourceType: 'cognition_snapshot', sourceId: bundle.preEventCognition.persisted.snapshotId, contentHash: canonicalHash(bundle.preEventCognition.cognition), observedAt: bundle.preEventCognition.persisted.evaluatedAt, reliability: fallback },
      { sourceType: 'invalidation_state', sourceId: bundle.postEventCognition?.persisted.snapshotId ?? bundle.preEventCognition.persisted.snapshotId, contentHash: canonicalHash(bundle.invalidationState), observedAt: bundle.postEventCognition?.persisted.evaluatedAt ?? bundle.preEventCognition.persisted.evaluatedAt, reliability: fallback },
      { sourceType: 'contradiction_input', sourceId: bundle.persistedContradictionInput.recordId, contentHash: bundle.persistedContradictionInput.normalizedInputHash, observedAt: bundle.persistedContradictionInput.availableAt, reliability: fallback },
      { sourceType: 'contradiction_matrix', sourceId: `contradiction-matrix:${canonicalHash(normalizedContradiction(bundle.contradictionMatrix))}`, contentHash: canonicalHash(normalizedContradiction(bundle.contradictionMatrix)), observedAt: bundle.contradictionMatrix.generatedAt, reliability: fallback },
    ];
    if (bundle.postEventCognition) refs.push({ sourceType: 'cognition_snapshot', sourceId: bundle.postEventCognition.persisted.snapshotId, contentHash: canonicalHash(bundle.postEventCognition.cognition), observedAt: bundle.postEventCognition.persisted.evaluatedAt, reliability: fallback });
    bundle.expectation.provenance.forEach((source) => refs.push({ sourceType: 'release_observation', sourceId: source.sourceId, contentHash: source.contentHash ?? canonicalHash(source), observedAt: bundle.expectation.createdAt, reliability: effectiveReliability(source) }));
    bundle.eventEvaluation.reactionProvenance.forEach((source) => refs.push({ sourceType: 'reaction_observation', sourceId: source.sourceId, contentHash: source.calculatedContentHash ?? source.suppliedContentHash ?? canonicalHash(source), observedAt: source.reactionInput.candles.at(-1)?.closedAt ?? source.reactionInput.eventTime ?? bundle.eventEvaluation.interpretedAt, reliability: envelopeReliability(source) }));
    bundle.persistedContradictionInput.provenance.forEach((source)=>refs.push({sourceType:'contradiction_input',sourceId:`${bundle.persistedContradictionInput.recordId}:${source.sourceId}`,contentHash:source.contentHash,observedAt:bundle.persistedContradictionInput.availableAt,reliability:source.reliability==='replay'&&(!source.verificationRef||!source.verifiedAt)?'unverified':source.reliability}));
    if (bundle.analogRetrieval) refs.push({ sourceType: 'analog_retrieval', sourceId: bundle.analogRetrieval.retrievalId, contentHash: canonicalHash({ retrievalId: bundle.analogRetrieval.retrievalId, queryFeatureHash: bundle.analogRetrieval.queryFeatureHash }), observedAt: bundle.analogRetrieval.createdAt, reliability: fallback });
    return payloadHash.normalizeReferences(refs);
  }
}

export function createContradictionActionProtocolService(persistence:ReasoningPersistenceRepository):ContradictionActionProtocolService {
  return new ContradictionActionProtocolService({eventRealityRepository:persistence.eventRealityRepository,eventExpectationRepository:persistence.eventExpectationRepository,cognitionSnapshotRepository:persistence.snapshotRepository,contradictionInputRepository:persistence.persistedContradictionInputRepository,analogRepository:persistence.historicalAnalogRepository,protocolRepository:persistence.contradictionActionProtocolRepository});
}
