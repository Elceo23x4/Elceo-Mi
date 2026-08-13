import { buildCanonicalCognitionStateFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import { normalizePersistedContradictionInputRecord } from '../contradiction-action-protocol/input-repository.js';
import {
  calculateOutcome,
  CANONICAL_RUNTIME_BASELINE,
  CanonicalRuntimeBaselineAuthority,
  canonicalHash,
  ProductionIfpChainAdapter,
} from '../intelligence-acceptance/index.js';
import type { FrozenCaseResult } from '../intelligence-acceptance/contracts.js';
import { MemoryReasoningPersistenceRepository } from '../persistence/memory-reasoning-repository.js';
import { serializeCanonicalCognitionState } from '../persistence/serialization.js';
import { buildCleanlinessEventFixture } from './market-cleanliness-fixtures.js';

/** Test-only production-chain fixture. It invokes the real IFP services; it is not certified evidence. */
export async function buildContractValidAcceptanceCase(suffix: string): Promise<FrozenCaseResult> {
  const persistence = new MemoryReasoningPersistenceRepository();
  const interpretedAt = '2026-01-01T01:00:00.000Z';
  const event = buildCleanlinessEventFixture({
    expectationId: `ifp8-pg-expectation-${suffix}`,
    eventEvaluationId: `ifp8-pg-event-${suffix}`,
    interpretedAt,
  });
  await persistence.eventExpectationRepository.saveEventExpectation(event.expectation);
  await persistence.eventRealityRepository.saveEventEvaluation(event);
  const contradictionInput = {
    asset: 'xau_usd', horizon: 'intraday', generatedAt: interpretedAt,
    evidencePoints: [{
      evidencePointId: `ifp8-pg-point-${suffix}`, asset: 'xau_usd', horizon: 'intraday',
      observedAt: '2026-01-01T00:45:00.000Z', evidenceClass: 'diagnostic',
      driverKind: 'unknown', side: 'context', direction: 'unknown', strength: 0, quality: 1,
      providerId: 'test-provider', sourceId: `ifp8-pg-source-${suffix}`,
      rationale: 'Persisted test-only context.', reasonCodes: [], warnings: [],
    }],
    priceReactionAvailable: true, priceReaction: event.reality.primaryPriceReaction,
    providerReliabilitySupplied: true, sourceIndependenceVerified: true, warnings: [],
  } as never;
  await persistence.persistedContradictionInputRepository.saveContradictionInput(
    normalizePersistedContradictionInputRecord({
      recordId: '', eventEvaluationId: event.eventEvaluationId, expectationId: event.expectationId,
      asset: event.asset, assessmentStage: event.assessmentStage,
      assessmentEvidenceHash: event.assessmentEvidenceHash, availableAt: interpretedAt,
      evidenceCutoffAt: interpretedAt, input: contradictionInput, normalizedInputHash: '',
      sourceEvidenceIds: [`ifp8-pg-source-${suffix}`],
      provenance: [{ sourceId: `ifp8-pg-source-${suffix}`, contentHash: `ifp8-pg-hash-${suffix}`, reliability: 'verified' }],
      providerReliabilitySupplied: true, sourceIndependenceVerified: true, warnings: [], limitations: [],
      createdAt: interpretedAt, canonicalPayloadHash: '',
    }),
  );
  for (const [snapshotId, reasoningRunId, evaluatedAt] of [
    ['pre', `ifp8-pg-pre-run-${suffix}`, '2025-12-30T23:59:00.000Z'],
    ['post', `ifp8-pg-post-run-${suffix}`, '2026-01-01T00:30:00.000Z'],
  ] as const) {
    const cognition = buildCanonicalCognitionStateFixture({
      asset: event.asset, evaluatedAt, evaluationWindowStart: evaluatedAt,
      evaluationWindowEnd: evaluatedAt, audit: { dataCutoffAt: evaluatedAt },
    } as never);
    await persistence.snapshotRepository.saveCognitionSnapshot({
      snapshotId, reasoningRunId, asset: event.asset, timeframe: 'H1', evaluatedAt,
      bias: cognition.bias, confidenceScore: cognition.confidence.score,
      contradictionScore: cognition.contradiction.score,
      freshnessScore: cognition.freshness.freshnessScore, sourceIngestionRunId: null,
      sourceIngestionRequestKey: null, reasoningVersion: cognition.audit.reasoningVersion,
      scoringVersion: cognition.audit.scoringVersion,
      cognitionJson: serializeCanonicalCognitionState(cognition), createdAt: evaluatedAt,
    });
  }
  const evidence = {
    caseId: `case-${suffix}`, eventInstanceId: `hold-${suffix}`,
    eventFamilyId: `c-${suffix}`, evidenceCutoffAt: interpretedAt, asset: event.asset,
    eventClass: event.expectation.eventKind, horizon: event.assessmentStage,
    qualifiedEvidenceFamilies: [], references: [],
    productionInput: { eventEvaluationId: event.eventEvaluationId, evidenceCutoffAt: interpretedAt },
  } as const;
  const outputs = await new ProductionIfpChainAdapter(
    persistence,
    new CanonicalRuntimeBaselineAuthority(),
  ).runAndPersist(evidence.productionInput, evidence, CANONICAL_RUNTIME_BASELINE);
  const outcome = calculateOutcome(evidence, {
    caseId: evidence.caseId, eventInstanceId: evidence.eventInstanceId, asset: evidence.asset,
    horizon: evidence.horizon, measurementStartAt: '2026-01-01T02:00:00.000Z',
    measurementEndAt: '2026-01-01T03:00:00.000Z', outcomeAvailableAt: '2026-01-01T03:00:00.000Z',
    observations: [],
  });
  const body = {
    caseId: evidence.caseId, eventInstanceId: evidence.eventInstanceId,
    decisionTimeEvidenceHash: canonicalHash(evidence), outputs,
    canonicalOutputHashes: outputs.canonicalOutputHashes,
    frozenAt: outcome.outcomeAvailableAt, outcome,
  };
  const canonicalPayloadHash = canonicalHash(body);
  return Object.freeze({
    ...body,
    caseResultId: `ifp8-case-${canonicalPayloadHash.slice(0, 32)}`,
    canonicalPayloadHash,
  });
}
