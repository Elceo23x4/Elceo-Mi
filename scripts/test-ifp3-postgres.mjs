import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL_required_for_ifp3_postgres');
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8 });
const root = new URL('../', import.meta.url);
const query = async (sql, params = []) => (await pool.query(sql, params)).rows;
const transaction = async (fn) => { const client=await pool.connect(); try { await client.query('BEGIN'); const value=await fn(async(sql,params=[])=>(await client.query(sql,params)).rows); await client.query('COMMIT'); return value; } catch(error){await client.query('ROLLBACK');throw error;} finally{client.release();} };
const expectedConstraint = async (name, fn) => { try { await fn(); assert.fail(`expected ${name}`); } catch (error) { assert.equal(error.code, '23505'); assert.equal(error.constraint, name); console.log(`constraint ${name}: ${error.code}`); } };

try {
  const files=(await readdir(new URL('infra/db/schema/',root))).filter((name)=>/^\d{4}.*\.sql$/.test(name)&&name.slice(0,4)<='0044').sort();
  for(const file of files) await pool.query(await readFile(new URL(`infra/db/schema/${file}`,root),'utf8'));
  const compiled=new URL('../services/reasoning/dist-test-cjs/services/reasoning/src/',import.meta.url);
  const { SqlEventExpectationRepository, SqlEventRealityRepository }=await import(new URL('persistence/sql-reasoning-repository.cjs',compiled));
  const { SqlPersistedContradictionInputRepository }=await import(new URL('contradiction-action-protocol/sql-input-repository.cjs',compiled));
  const { normalizePersistedContradictionInputRecord }=await import(new URL('contradiction-action-protocol/input-repository.cjs',compiled));
  const { SqlContradictionActionProtocolRepository }=await import(new URL('contradiction-action-protocol/sql-repository.cjs',compiled));
  await pool.query(`INSERT INTO app_cognition_snapshots(snapshot_id,reasoning_run_id,asset,timeframe,evaluated_at,bias,confidence_score,contradiction_score,freshness_score,reasoning_version,scoring_version,cognition_json,created_at) VALUES
    ('pg-cognition','pg-run-pre','xau_usd','H1','2025-12-31T00:00:00Z','bearish',50,0,100,'rv','sv','{}','2025-12-31T00:00:00Z'),
    ('pg-post','pg-run-post','xau_usd','H1','2026-01-01T00:10:00Z','bearish',50,0,100,'rv','sv','{}','2026-01-01T00:10:00Z')`);
  const expectationRepo=new SqlEventExpectationRepository(query);
  const realityRepo=new SqlEventRealityRepository(query);
  const inputRepo=new SqlPersistedContradictionInputRepository(query,transaction);
  const expectation={expectationId:'pg-exp',asset:'xau_usd',eventReleaseId:'pg-release',eventKind:'cpi',scheduledReleaseTime:'2026-01-01T00:00:00.000Z',issuedAt:'2025-12-31T00:00:00.000Z',dataCutoffAt:'2025-12-31T00:00:00.000Z',expectationKind:'event',affectedAssets:['xau_usd'],affectedCurrencies:['USD'],indicatorKind:'cpi',indicatorCategory:'inflation',region:'US',currency:'USD',importance:'high',expectationBasis:{kind:'numeric',forecast:1,previous:1,unit:'pct'},expectedEconomicMeaning:'inflationary',expectedPolicyPressure:'hawkish',expectedAssetDirection:'bearish',requiredRelatedAssets:[],preEventCognitionSnapshotId:'pg-cognition',preEventConfidence:50,preEventContradiction:0,expectedConfirmationConditions:[],provenance:[],createdAt:'2025-12-31T00:00:00.000Z'};
  await expectationRepo.saveEventExpectation(expectation);
  const base={expectationId:'pg-exp',releaseId:'pg-release',releaseVersion:'v1',asset:'xau_usd',preEventCognitionSnapshotId:'pg-cognition',postEventCognitionSnapshotId:'pg-post',observationContentHash:'obs',relatedEvidenceStatus:'not_required',relatedEvidenceDecisionAt:'2026-01-01T00:00:00.000Z',relatedEvidencePolicyVersion:'related-evidence-closure-v1',relatedEvidenceReasonCodes:[],reactionProvenance:[],outcome:'confirmed',reasonCodes:[],warnings:[],rationale:'Factual assessment.',expectation,reality:{limitations:[]}};
  const evaluations=[
    {...base,eventEvaluationId:'pg-immediate',assessmentEvidenceHash:'a1',assessmentStage:'immediate',finalizationStatus:'provisional',finalizationReadiness:{ready:false,reasonCodes:['later_window_pending']},interpretedAt:'2026-01-01T00:10:00.000Z',createdAt:'2026-01-01T00:10:00.000Z'},
    {...base,eventEvaluationId:'pg-confirmation',assessmentEvidenceHash:'a2',assessmentStage:'confirmation',finalizationStatus:'finalizable',finalizationReadiness:{ready:true,reasonCodes:[]},outcome:'rejected',interpretedAt:'2026-01-01T00:20:00.000Z',createdAt:'2026-01-01T00:20:00.000Z'},
    {...base,eventEvaluationId:'pg-follow',assessmentEvidenceHash:'a3',assessmentStage:'follow_through',finalizationStatus:'final',finalizationReadiness:{ready:true,reasonCodes:[]},interpretedAt:'2026-01-01T00:30:00.000Z',createdAt:'2026-01-01T00:30:00.000Z'}
  ];
  for(const evaluation of evaluations) await realityRepo.saveEventEvaluation(evaluation);
  const timeline=await realityRepo.listEventEvaluationTimeline({expectationId:'pg-exp',releaseVersion:'v1',limit:10});
  assert.deepEqual(timeline.map((row)=>row.eventEvaluationId),['pg-immediate','pg-confirmation','pg-follow']);
  assert.equal(timeline.filter((row)=>row.finalizationStatus==='final').length,1);
  await expectedConstraint('app_event_reality_final_uidx',()=>realityRepo.saveEventEvaluation({...evaluations[2],eventEvaluationId:'pg-second-final',assessmentEvidenceHash:'a4'}));

  const marketInput={asset:'xau_usd',horizon:'intraday',generatedAt:'2026-01-01T00:10:00.000Z',evidencePoints:[],priceReactionAvailable:false,providerReliabilitySupplied:true,sourceIndependenceVerified:true,warnings:[]};
  const makeInput=(evaluationId,assessmentStage,assessmentEvidenceHash)=>normalizePersistedContradictionInputRecord({recordId:'',eventEvaluationId:evaluationId,expectationId:'pg-exp',asset:'xau_usd',assessmentStage,assessmentEvidenceHash,availableAt:'2026-01-01T00:30:00.000Z',evidenceCutoffAt:'2026-01-01T01:00:00.000Z',input:marketInput,normalizedInputHash:'',sourceEvidenceIds:[],provenance:[],providerReliabilitySupplied:true,sourceIndependenceVerified:true,warnings:[],limitations:[],createdAt:'2026-01-01T00:30:00.000Z',canonicalPayloadHash:''});
  const stored=await inputRepo.saveContradictionInput(makeInput('pg-immediate','immediate','a1'));
  assert.deepEqual(await inputRepo.getContradictionInputById(stored.recordId),stored);
  assert.deepEqual(await inputRepo.getContradictionInputForEvent('pg-immediate'),stored);
  assert.deepEqual(await inputRepo.saveContradictionInput(stored),stored);
  await inputRepo.saveContradictionInput(makeInput('pg-confirmation','confirmation','a2'));
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM contradiction_action_protocol_inputs')).rows[0].count,2);

  const protocolRepo=new SqlContradictionActionProtocolRepository(pool);
  const protocolRecord=(id,evaluation,inputId,stage,order,previous=null)=>({protocolDecisionId:id,policyVersion:'contradiction-action-protocol-v1',sourceEventEvaluationId:evaluation.eventEvaluationId,sourceExpectationId:'pg-exp',sourceContradictionInputId:inputId,sourceAnalogRetrievalId:null,sourceCognitionSnapshotIds:[],sourceAsset:'xau_usd',sourceReleaseId:'pg-release',sourceReleaseVersion:'v1',sourceAssessmentStage:stage,sourceAssessmentStageOrder:order,eventInstanceKey:'pg-exp:pg-release:v1:xau_usd',contradictionEvidenceHash:`contradiction-${id}`,invalidationStateHash:`invalidation-${id}`,analogContextHash:null,evidenceCutoffAt:'2026-01-01T01:00:00.000Z',evidenceSufficiency:order===1?'provisional':'sufficient',protocolState:order===1?'wait_for_confirmation':'review_required',transitionReasons:order===1?['non_final_assessment']:['material_contradiction'],reviewPrompts:[],blockedActionClasses:['trade_execution','position_entry','position_exit','position_sizing','leverage_selection','stop_placement','target_placement'],warnings:[],limitations:[],deterministicRationale:'Persisted governance rationale.',sourceEvidenceReferences:[],contradictionEvidence:{},invalidationEvidence:{},analogContext:{},provenance:{},previousDecision:previous,createdAt:evaluation.createdAt,canonicalPayloadHash:`payload-${id}`});
  const immediateRecord=protocolRecord('pg-decision-immediate',evaluations[0],stored.recordId,'immediate',1);
  await protocolRepo.saveProtocolRecord(immediateRecord);
  const confirmationInput=await inputRepo.getContradictionInputForEvent('pg-confirmation');
  const successorA=protocolRecord('pg-decision-confirmation-a',evaluations[1],confirmationInput.recordId,'confirmation',2,{previousProtocolDecisionId:immediateRecord.protocolDecisionId,transitionId:'pg-transition-a',supersedes:true});
  const successorB=protocolRecord('pg-decision-confirmation-b',evaluations[1],confirmationInput.recordId,'confirmation',2,{previousProtocolDecisionId:immediateRecord.protocolDecisionId,transitionId:'pg-transition-b',supersedes:true});
  const race=await Promise.allSettled([protocolRepo.saveProtocolRecord(successorA),protocolRepo.saveProtocolRecord(successorB)]);
  assert.equal(race.filter((result)=>result.status==='fulfilled').length,1,'exactly one competing successor commits');
  const rejected=race.find((result)=>result.status==='rejected');
  assert.match(String(rejected.reason),/protocol_supersession_fork/);
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM contradiction_action_protocol_transitions WHERE previous_protocol_decision_id=$1',[immediateRecord.protocolDecisionId])).rows[0].count,1);
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM contradiction_action_protocol_evidence_refs WHERE protocol_decision_id IN ($1,$2)',[successorA.protocolDecisionId,successorB.protocolDecisionId])).rows[0].count,0);
  assert.equal((await protocolRepo.listProtocolRecordsForEventInstance(immediateRecord.eventInstanceKey)).length,2);
  console.log('IFP-3 PostgreSQL lifecycle, constraints, and competing-successor race passed');
} finally { await pool.end(); }
