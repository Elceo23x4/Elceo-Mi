import assert from 'node:assert/strict';
import { buildCanonicalCognitionStateFixture } from '../../../../packages/schemas/src/test-fixtures.js';
import type { InvalidationState, MarketContradictionInput } from '@elceo/types';
import { ContradictionActionProtocolService, MemoryContradictionActionProtocolRepository, SqlContradictionActionProtocolRepository, payloadHash, validateNoAdviceRecord } from '../contradiction-action-protocol/index.js';
import { MemoryEventExpectationRepository, MemoryEventRealityRepository } from '../expectation-reality/repository.js';
import { MemoryCognitionSnapshotRepository, MemoryReasoningPersistenceRepository } from '../persistence/memory-reasoning-repository.js';

const cutoff = '2026-01-01T02:00:00.000Z';
const clearInvalidation: InvalidationState = { primary: null, secondary: [], summary: 'No active invalidation.', riskLabel: 'guarded' };
const brokenInvalidation: InvalidationState = { primary: { invalidationId:'inv-1', asset:'xau_usd', timeframe:'H1', price:1, side:'bearish_invalidation', severityScore:100, reason:'Canonical persisted break.', linkedEvidenceIds:['e-1'], linkedZoneIds:['z-1'], triggeredBy:['price'], confirmed:true, confirmedAt:'2026-01-01T01:00:00.000Z' }, secondary: [], summary: 'Canonical break confirmed.', riskLabel: 'broken' };

function expectation(reliability: 'verified'|'fixture'|'unverified' = 'verified', overrides: Record<string, unknown> = {}) {
  return { expectationId:'exp-1', asset:'xau_usd', eventReleaseId:'rel-1', eventKind:'cpi', scheduledReleaseTime:'2026-01-01T00:00:00.000Z', issuedAt:'2025-12-31T00:00:00.000Z', dataCutoffAt:'2025-12-31T00:00:00.000Z', expectationKind:'event', affectedAssets:['xau_usd'], affectedCurrencies:['USD'], indicatorKind:'cpi', indicatorCategory:'inflation', region:'US', currency:'USD', importance:'high', expectationBasis:{kind:'numeric',forecast:1,previous:1,unit:'pct'}, expectedEconomicMeaning:'inflationary', expectedPolicyPressure:'hawkish', expectedAssetDirection:'bearish', requiredRelatedAssets:[], preEventCognitionSnapshotId:'cog-pre', preEventConfidence:50, preEventContradiction:20, expectedConfirmationConditions:[], provenance:[{sourceId:'src',provider:'fixture',reliability,contentHash:'hash'}], createdAt:'2025-12-31T00:00:00.000Z', ...overrides };
}
function evaluation(overrides: Record<string, unknown> = {}) {
  const outcome = (overrides.outcome as string | undefined) ?? 'confirmed';
  return { eventEvaluationId:'eval-1', expectationId:'exp-1', releaseId:'rel-1', releaseVersion:'v1', asset:'xau_usd', preEventCognitionSnapshotId:'cog-pre', postEventCognitionSnapshotId:'cog-post', observationContentHash:'obs-hash', assessmentEvidenceHash:'assess-hash', assessmentStage:'follow_through', finalizationStatus:'final', finalizationReadiness:{ready:true,reasonCodes:[]}, relatedEvidenceStatus:'not_required', relatedEvidenceDecisionAt:null, relatedEvidencePolicyVersion:'related-evidence-closure-v1', relatedEvidenceReasonCodes:[], reactionProvenance:[], interpretedAt:'2026-01-01T01:00:00.000Z', outcome, reasonCodes:[], warnings:[], rationale:'The observed reaction was bearish.', createdAt:'2026-01-01T01:00:00.000Z', expectation:expectation(), reality:{ observedAt:'2026-01-01T00:30:00.000Z', provenance:[{sourceId:'src',provider:'fixture',reliability:'verified'}], primaryPriceReaction:{status:outcome}, postEventContradiction:(overrides.contradictionScore as number | undefined) ?? 0, postEventConfidence:(overrides.confidence as number | undefined) ?? 50, postEventCognitionSnapshotId:'cog-post', postEventCognitionEvaluatedAt:'2026-01-01T01:00:00.000Z', biasChange:{before:'bearish',after:'bearish',changed:false}, observationContentHash:'obs-hash', reactionProvenance:[], relatedEvidenceDecision:{policyVersion:'related-evidence-closure-v1',status:'not_required',decidedAt:null,reasonCodes:[]}, limitations:[] }, ...overrides };
}
function input(overrides: Partial<MarketContradictionInput> = {}): MarketContradictionInput {
  return { asset:'xau_usd', horizon:'intraday', generatedAt:'2026-01-01T01:00:00.000Z', evidencePoints:[{ evidencePointId:'point-1', asset:'xau_usd', horizon:'intraday', observedAt:'2026-01-01T00:45:00.000Z', evidenceClass:'diagnostic', driverKind:'unknown', side:'context', direction:'unknown', strength:0, quality:1, providerId:'provider', sourceId:'source-1', rationale:'Persisted context.', reasonCodes:[], warnings:[] }], priceReactionAvailable:false, providerReliabilitySupplied:true, sourceIndependenceVerified:true, warnings:[], ...overrides };
}

async function environment(options: { evaluation?: Record<string, unknown>; reliability?: 'verified'|'fixture'|'unverified'; invalidation?: InvalidationState; contradictionInput?: MarketContradictionInput } = {}) {
  const eventRealityRepository = new MemoryEventRealityRepository();
  const eventExpectationRepository = new MemoryEventExpectationRepository();
  const cognitionSnapshotRepository = new MemoryCognitionSnapshotRepository();
  const protocolRepository = new MemoryContradictionActionProtocolRepository();
  const expected = expectation(options.reliability);
  const assessed = evaluation(options.evaluation);
  assessed.expectation = expected;
  assessed.reality.provenance = expected.provenance;
  await eventExpectationRepository.saveEventExpectation(expected as never);
  await eventRealityRepository.saveEventEvaluation(assessed as never);
  for (const [snapshotId, evaluatedAt, invalidation] of [['cog-pre','2025-12-30T23:00:00.000Z',clearInvalidation], ['cog-post','2026-01-01T01:00:00.000Z',options.invalidation ?? clearInvalidation]] as const) {
    const cognition = buildCanonicalCognitionStateFixture({ asset:'xau_usd', timeframe:'H1', evaluatedAt, invalidation, audit:{ reasoningVersion:'rv', scoringVersion:'sv', evaluatedBy:'test', dataCutoffAt:evaluatedAt } } as never);
    await cognitionSnapshotRepository.saveCognitionSnapshot({ snapshotId, reasoningRunId:`run-${snapshotId}`, asset:'xau_usd', timeframe:'H1', evaluatedAt, bias:cognition.bias, confidenceScore:cognition.confidence.score, contradictionScore:cognition.contradiction.score, freshnessScore:cognition.freshness.freshnessScore, sourceIngestionRunId:null, sourceIngestionRequestKey:null, reasoningVersion:'rv', scoringVersion:'sv', cognitionJson:JSON.stringify(cognition), createdAt:evaluatedAt });
  }
  const persistedInput = options.contradictionInput ?? input();
  const service = new ContradictionActionProtocolService({ eventRealityRepository, eventExpectationRepository, cognitionSnapshotRepository, contradictionInputRepository:{ loadInputForEvent:async () => persistedInput }, protocolRepository });
  return { service, protocolRepository, eventRealityRepository, eventExpectationRepository, cognitionSnapshotRepository };
}

async function decide(options: Parameters<typeof environment>[0] = {}) { const env = await environment(options); return env.service.decide({ eventEvaluationId:'eval-1', evidenceCutoffAt:cutoff }); }

class TransactionalProtocolPool {
  records = new Map<string, unknown>();
  refs: unknown[][] = [];
  failEvidenceInsert = false;
  private tail = Promise.resolve();
  async connect() {
    let unlock!: () => void;
    const turn = new Promise<void>((resolve) => { unlock = resolve; });
    const wait = this.tail;
    this.tail = this.tail.then(() => turn);
    await wait;
    let records = new Map(this.records); let refs = [...this.refs];
    return { query: async (sql:string, params:unknown[] = []) => {
      if (sql === 'BEGIN') { records = new Map(this.records); refs = [...this.refs]; return {rows:[]}; }
      if (sql === 'COMMIT') { this.records = records; this.refs = refs; return {rows:[]}; }
      if (sql === 'ROLLBACK') { records = new Map(this.records); refs = [...this.refs]; return {rows:[]}; }
      if (sql.startsWith('SELECT canonical_payload')) { const value = records.get(String(params[0])); return {rows:value ? [{canonical_payload:value}] : [], rowCount:value ? 1 : 0}; }
      if (sql.startsWith('INSERT INTO contradiction_action_protocol_records')) { const id=String(params[0]); if(records.has(id)) throw new Error('duplicate'); records.set(id, JSON.parse(String(params[20]))); return {rows:[],rowCount:1}; }
      if (sql.startsWith('INSERT INTO contradiction_action_protocol_evidence_refs')) { if(this.failEvidenceInsert) throw new Error('child_conflict'); refs.push(params); return {rows:[],rowCount:1}; }
      if (sql.startsWith('WITH RECURSIVE') || sql.startsWith('INSERT INTO contradiction_action_protocol_transitions')) return {rows:[],rowCount:0};
      throw new Error(`unsupported_sql:${sql}`);
    }, release: unlock };
  }
  async query(sql:string, params:unknown[] = []) { if(sql.startsWith('SELECT canonical_payload')) { const value=this.records.get(String(params[0])); return {rows:value?[{canonical_payload:value}]:[],rowCount:value?1:0}; } return {rows:[],rowCount:0}; }
}

export async function runContradictionActionProtocolTests(): Promise<void> {
  const archived = await decide();
  assert.equal(archived.protocolState, 'archive_resolved', 'only final resolved direct evidence archives');
  for (const finalizationStatus of ['provisional','finalizable']) assert.equal((await decide({ evaluation:{ finalizationStatus, assessmentStage:'immediate' } })).protocolState, 'wait_for_confirmation', `${finalizationStatus} cannot archive`);
  assert.equal((await decide({ evaluation:{ outcome:'insufficient_data' } })).protocolState, 'wait_for_confirmation', 'final insufficient data cannot archive');
  assert.equal((await decide({ evaluation:{ outcome:'absorbed', finalizationStatus:'provisional' } })).protocolState, 'wait_for_confirmation', 'pending absorbed evidence waits');
  assert.equal((await decide({ evaluation:{ outcome:'absorbed' } })).protocolState, 'archive_resolved', 'final absorbed evidence may archive after requirements close');
  assert.equal((await decide({ evaluation:{ outcome:'ambiguous' } })).protocolState, 'review_required', 'final ambiguity follows explicit review policy');
  assert.equal((await decide({ invalidation:brokenInvalidation })).protocolState, 'invalidate_thesis', 'canonical persisted broken cognition invalidation has highest precedence');
  for (const reliability of ['fixture','unverified'] as const) {
    const result = await decide({ reliability, invalidation:brokenInvalidation });
    assert.equal(result.protocolState, 'wait_for_confirmation', `${reliability} direct evidence cannot create a hard state`);
    assert(result.sourceEvidenceReferences.some((ref) => ref.reliability === reliability), `${reliability} reliability survives serialization`);
    assert.equal(result.provenance[`${reliability}SourceCount`], result.sourceEvidenceReferences.filter((ref) => ref.reliability === reliability).length, 'provenance totals equal references');
  }
  await assert.rejects(() => decide({ contradictionInput:input({ generatedAt:'2026-01-01T03:00:00.000Z' }) }), /contradiction_input_after_protocol_cutoff/, 'matrix input after cutoff rejected');
  await assert.rejects(() => decide({ contradictionInput:input({ evidencePoints:[{...input().evidencePoints[0]!, observedAt:'2026-01-01T03:00:00.000Z'}] }) }), /contradiction_evidence_after_protocol_cutoff/, 'evidence point after cutoff rejected');
  await assert.rejects(() => decide({ contradictionInput:input({ asset:'eur_usd' }) }), /contradiction_input_asset_mismatch/, 'cross-asset input rejected');
  await assert.rejects(() => decide({ contradictionInput:input({ generatedAt:'not-a-date' }) }), /invalid_contradiction_generated_at_timestamp/, 'malformed dates rejected');
  assert.equal('contradictionInputForEvent' in ({} as ConstructorParameters<typeof ContradictionActionProtocolService>[0]), false, 'public dependency has no completed matrix callback');
  assert.notEqual((await decide({ evaluation:{ confidence:0, contradictionScore:100 } })).protocolState, 'invalidate_thesis', 'zero confidence and contradiction score alone cannot invalidate');
  assert.notEqual((await decide({ evaluation:{ confidence:0, contradictionScore:100 } })).protocolState, 'escalate_review', 'zero confidence alone cannot escalate');

  const reordered = input({ evidencePoints:[...input().evidencePoints, {...input().evidencePoints[0]!, evidencePointId:'point-2', sourceId:'source-2'}] });
  const first = await decide({ contradictionInput:reordered });
  const second = await decide({ contradictionInput:{...reordered, evidencePoints:[...reordered.evidencePoints].reverse()} });
  assert.equal(first.protocolDecisionId, second.protocolDecisionId, 'evidence-point reordering preserves identity');
  assert.equal(first.canonicalPayloadHash, second.canonicalPayloadHash, 'normalized evidence references preserve payload hash');
  const changed = await decide({ contradictionInput:{...reordered, evidencePoints:reordered.evidencePoints.map((point, index) => index ? {...point, strength:0.5} : point)} });
  assert.notEqual(first.protocolDecisionId, changed.protocolDecisionId, 'substantive evidence changes identity');

  const replayEnv = await environment();
  const one = await replayEnv.service.decide({eventEvaluationId:'eval-1',evidenceCutoffAt:cutoff});
  const two = await replayEnv.service.decide({eventEvaluationId:'eval-1',evidenceCutoffAt:cutoff});
  assert.equal(one.protocolDecisionId, two.protocolDecisionId, 'identical retry is idempotent');
  await assert.rejects(() => replayEnv.protocolRepository.saveProtocolRecord({...one, deterministicRationale:'different'}), /immutable_protocol_record_conflict/, 'different payload cannot share an identity');
  validateNoAdviceRecord(one);
  assert.throws(() => validateNoAdviceRecord('buy now'), /trading_advice/, 'no-advice validator rejects instructions');
  assert.equal(payloadHash({...one, canonicalPayloadHash:undefined} as never).length, 64, 'payload hashing executes');
  assert(new MemoryReasoningPersistenceRepository().contradictionActionProtocolRepository, 'canonical memory persistence composition exposes protocol repository');
  const pool = new TransactionalProtocolPool();
  const sql = new SqlContradictionActionProtocolRepository(pool);
  const [sqlOne, sqlTwo] = await Promise.all([sql.saveProtocolRecord(one), sql.saveProtocolRecord(one)]);
  assert.equal(sqlOne.protocolDecisionId, sqlTwo.protocolDecisionId, 'SQL concurrent identical saves return one canonical record');
  assert.equal(pool.records.size, 1, 'SQL identical replay stores one parent');
  await assert.rejects(() => sql.saveProtocolRecord({...one, deterministicRationale:'SQL conflict'}), /immutable_protocol_record_conflict/, 'SQL conflicting replay rejected');
  const conflictPool = new TransactionalProtocolPool();
  const conflictSql = new SqlContradictionActionProtocolRepository(conflictPool);
  const conflictResults = await Promise.allSettled([conflictSql.saveProtocolRecord(one), conflictSql.saveProtocolRecord({...one, deterministicRationale:'concurrent conflict'})]);
  assert.equal(conflictResults.filter((result) => result.status === 'fulfilled').length, 1, 'SQL concurrent conflicting saves cannot both succeed');
  const rollbackPool = new TransactionalProtocolPool(); rollbackPool.failEvidenceInsert = true;
  await assert.rejects(() => new SqlContradictionActionProtocolRepository(rollbackPool).saveProtocolRecord(one), /child_conflict/, 'SQL child conflict executes rollback');
  assert.equal(rollbackPool.records.size, 0, 'SQL rollback leaves no partial parent');
  console.log('contradiction-action-protocol tests passed');
}
