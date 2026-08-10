import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_required_for_ifp4_postgres');
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 12 });
const root = new URL('../', import.meta.url);
try {
  const migrations = (await readdir(new URL('infra/db/schema/', root))).filter((name) => /^\d{4}.*\.sql$/.test(name) && name.slice(0, 4) <= '0045').sort();
  for (const name of migrations) await pool.query(await readFile(new URL(`infra/db/schema/${name}`, root), 'utf8'));
  assert(migrations.at(-1)?.startsWith('0045_'), 'IFP4 standalone migration execution');

  const compiled = new URL('../services/reasoning/dist-test-cjs/services/reasoning/src/', import.meta.url);
  const { SqlReasoningPersistenceRepository } = await import(new URL('persistence/sql-reasoning-repository.cjs', compiled));
  const { MemoryReasoningPersistenceRepository } = await import(new URL('persistence/memory-reasoning-repository.cjs', compiled));
  const { createMarketSessionLiquidityContext, createMarketCleanlinessService, evaluateMarketCleanliness, buildMarketCleanlinessDistributionReport } = await import(new URL('market-cleanliness/index.cjs', compiled));
  const { buildCleanlinessEventFixture, buildSessionContextDraft, CLEANLINESS_CUTOFF } = await import(new URL('tests/market-cleanliness-fixtures.cjs', compiled));
  const persistence = new SqlReasoningPersistenceRepository();

  await pool.query(`INSERT INTO app_cognition_snapshots(snapshot_id,reasoning_run_id,asset,timeframe,evaluated_at,bias,confidence_score,contradiction_score,freshness_score,reasoning_version,scoring_version,cognition_json,created_at) VALUES
    ('pre','ifp4-run-pre','xau_usd','H1','2025-12-31T00:00:00Z','bullish',60,10,100,'rv','sv','{}','2025-12-31T00:00:00Z'),
    ('post','ifp4-run-post','xau_usd','H1','2026-01-01T00:30:00Z','bearish',60,10,100,'rv','sv','{}','2026-01-01T00:30:00Z')`);

  const persisted = new Map();
  async function scenario(name, overrides = {}, contextOverrides = {}, mutate = (event) => event, analog = null) {
    const expectationId = `ifp4-exp-${name}`;
    const eventEvaluationId = `ifp4-eval-${name}`;
    const event = mutate(buildCleanlinessEventFixture({ ...overrides, expectationId, eventEvaluationId }));
    await persistence.eventExpectationRepository.saveEventExpectation(event.expectation);
    await persistence.eventRealityRepository.saveEventEvaluation(event);
    const context = createMarketSessionLiquidityContext(buildSessionContextDraft({ ...contextOverrides, eventEvaluationId, evidenceCutoffAt:CLEANLINESS_CUTOFF }));
    await persistence.marketSessionLiquidityContextRepository.saveContext(context);
    if (analog) await persistence.historicalAnalogRepository.saveRetrievalResult({ ...analog, queryEventEvaluationId:eventEvaluationId });
    const service = createMarketCleanlinessService(persistence);
    const evaluation = await service.evaluate({ eventEvaluationId, sessionLiquidityContextId:context.contextId, ...(analog ? { analogRetrievalId:analog.retrievalId } : {}), evidenceCutoffAt:CLEANLINESS_CUTOFF });
    persisted.set(name, { event, context, evaluation });
    return evaluation;
  }

  assert.equal((await scenario('confirmation', { expectationDirection:'bearish', releaseStatus:'aligned' })).cleanlinessState, 'clean', 'SQL clean confirmation');
  const rejection = await scenario('rejection');
  assert.equal(rejection.cleanlinessState, 'clean', 'IFP4 actual service-driven PostgreSQL clean rejection');
  assert.equal((await scenario('neutral', { direction:'neutral', primaryDirection:'neutral', releaseStatus:'inline', expectationDirection:'neutral' })).cleanlinessState, 'clean', 'SQL clean neutral inline');
  assert.equal((await scenario('primary-conflict', { direction:'bullish', primaryDirection:'bearish', releaseStatus:'aligned' })).cleanlinessState, 'conflicted', 'SQL release primary conflict');
  assert.equal((await scenario('reversal', { reversal:true })).cleanlinessState, 'conflicted', 'SQL follow-through reversal');
  assert.equal((await scenario('related-conflict', { related:'conflicting_final' })).cleanlinessState, 'conflicted', 'SQL related final conflict');
  assert.equal((await scenario('missing-volatility', {}, {}, (event) => { event.reality.priceReactionTimeline.primaryObservation.reactionInput.volatilityBasisPct=null; return event; })).cleanlinessState, 'insufficient_data', 'SQL missing volatility insufficiency');
  assert.equal((await scenario('provenance-limited', { releaseProvenance:[{sourceId:'release',provider:'source',reliability:'verified',effectiveReliability:'fixture'}] })).cleanlinessState, 'insufficient_data', 'SQL provenance-limited insufficiency');
  assert((await scenario('thin-session', {}, { liquidityState:'thin', spreadState:'wide' })).components.find((item) => item.component==='session_liquidity_quality').score < 60, 'SQL session liquidity limitation');

  const sparse = { retrievalId:'ifp4-sparse-retrieval',queryEventEvaluationId:'placeholder',queryEventInstanceKey:'sparse-event',queryCutoffAt:'2026-01-01T01:00:00.000Z',queryElapsedMs:60,queryEvidenceMaturityRatio:1,retrievalPolicyVersion:'historical-analog-retrieval-v1',featurePolicyVersion:'historical-analog-features-v1',queryFeatureHash:'sparse-query',rankingMemorySnapshotHash:'sparse-rank',outcomeAttachmentSnapshotHash:'sparse-outcome',memorySnapshotHash:'sparse-memory',memorySnapshot:[],evidenceSufficiency:'sparse',eligibleUniqueEventCount:1,strongAnalogCount:0,exclusionReasonCounts:{},matches:[],warnings:[],limitations:['sparse history'],createdAt:'2026-01-01T01:00:00.000Z' };
  const sparseEvaluation = await scenario('sparse-analog', {}, {}, (event) => event, sparse);
  assert.equal(sparseEvaluation.components.find((item) => item.component==='analog_consistency').availability, 'unavailable', 'SQL sparse analog unavailable');

  const service = createMarketCleanlinessService(persistence);
  assert.deepEqual(await service.evaluate({eventEvaluationId:'ifp4-eval-rejection',sessionLiquidityContextId:persisted.get('rejection').context.contextId,evidenceCutoffAt:CLEANLINESS_CUTOFF}), rejection, 'SQL immutable identical service replay');
  await assert.rejects(() => persistence.marketCleanlinessRepository.saveEvaluation({...rejection,deterministicRationale:'changed'}), /immutable_cleanliness_evaluation_conflict/, 'SQL immutable conflicting replay');
  const concurrent = await Promise.all([persistence.marketCleanlinessRepository.saveEvaluation(rejection),persistence.marketCleanlinessRepository.saveEvaluation(rejection)]);
  assert.deepEqual(concurrent[0], concurrent[1], 'SQL concurrent identical save');
  const conflicts = await Promise.allSettled([persistence.marketCleanlinessRepository.saveEvaluation(rejection),persistence.marketCleanlinessRepository.saveEvaluation({...rejection,deterministicRationale:'competing'})]);
  assert.equal(conflicts.filter((result) => result.status==='rejected').length, 1, 'SQL concurrent conflicting save');

  const contextCount = Number((await pool.query('SELECT count(*) count FROM market_session_liquidity_contexts')).rows[0].count);
  const missingEventContext = createMarketSessionLiquidityContext(buildSessionContextDraft({eventEvaluationId:'missing-event'}));
  await assert.rejects(() => persistence.marketSessionLiquidityContextRepository.saveContext(missingEventContext), /session_context_event_missing/, 'stable PostgreSQL domain errors: context event');
  assert.equal(Number((await pool.query('SELECT count(*) count FROM market_session_liquidity_contexts')).rows[0].count), contextCount, 'context FK rollback has no partial row');
  await assert.rejects(() => persistence.marketCleanlinessRepository.saveEvaluation({...rejection,cleanlinessEvaluationId:'ifp4-bad-lineage',sourceEventEvaluationId:'ifp4-eval-confirmation',canonicalPayloadHash:'bad-lineage'}), /cleanliness_context_missing/, 'IFP4 SQL context/evaluation lineage rejection');
  await assert.rejects(() => persistence.marketCleanlinessRepository.saveEvaluation({...rejection,cleanlinessEvaluationId:'ifp4-missing-expectation',sourceExpectationId:'missing-expectation',sourceSessionLiquidityContextId:null,canonicalPayloadHash:'missing-expectation'}), /cleanliness_expectation_missing/, 'stable PostgreSQL domain errors: expectation');
  await assert.rejects(() => persistence.marketCleanlinessRepository.saveEvaluation({...rejection,cleanlinessEvaluationId:'ifp4-score-range',sourceSessionLiquidityContextId:null,rawAgreementScore:101,canonicalPayloadHash:'score-range'}), /cleanliness_score_out_of_range/, 'stable PostgreSQL domain errors: score');

  const rows = await persistence.marketCleanlinessRepository.listEvaluations();
  const report = buildMarketCleanlinessDistributionReport(rows, 'asset', CLEANLINESS_CUTOFF);
  assert.equal(report.groups[0].sampleSize, rows.length, 'SQL report grouping and distributions');
  const memory = new MemoryReasoningPersistenceRepository();
  const rejectionInput = persisted.get('rejection');
  const memoryEvaluation = evaluateMarketCleanliness({event:rejectionInput.event,analog:null,session:rejectionInput.context,evidenceCutoffAt:CLEANLINESS_CUTOFF});
  assert.deepEqual({state:memoryEvaluation.cleanlinessState,raw:memoryEvaluation.rawAgreementScore,coverage:memoryEvaluation.evidenceCoverageRatio,qualified:memoryEvaluation.evidenceQualifiedScore,components:memoryEvaluation.components},{state:rejection.cleanlinessState,raw:rejection.rawAgreementScore,coverage:rejection.evidenceCoverageRatio,qualified:rejection.evidenceQualifiedScore,components:rejection.components},'canonical memory SQL parity');
  assert(memory.marketCleanlinessRepository && memory.marketSessionLiquidityContextRepository, 'canonical memory composition exposes IFP4');
  console.log('IFP-4 standalone canonical service-driven PostgreSQL acceptance passed');
} finally { await pool.end(); }
