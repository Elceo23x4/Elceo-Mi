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
  assert.deepEqual(await inputRepo.getContradictionInputById(stored.recordId),stored,'SQL input retrieval by record ID');
  assert.deepEqual(await inputRepo.getContradictionInputForEvent('pg-immediate'),stored,'SQL input retrieval by event evaluation');
  assert.deepEqual(await inputRepo.saveContradictionInput(stored),stored,'SQL input identical replay');
  const confirmationInput=await inputRepo.saveContradictionInput(makeInput('pg-confirmation','confirmation','a2'));
  const expectDomainError=async(label,pattern,record)=>{const before=(await pool.query('SELECT count(*)::int AS count FROM contradiction_action_protocol_inputs')).rows[0].count;await assert.rejects(()=>inputRepo.saveContradictionInput(record),(error)=>error instanceof Error&&error.message===pattern,label);assert.equal((await pool.query('SELECT count(*)::int AS count FROM contradiction_action_protocol_inputs')).rows[0].count,before,`${label} rolls back without a partial row`);};
  await expectDomainError('duplicate event input normalized','event_contradiction_input_conflict',normalizePersistedContradictionInputRecord({...makeInput('pg-immediate','immediate','a1'),warnings:['different-content']}));
  await expectDomainError('missing event evaluation normalized','contradiction_input_event_evaluation_missing',makeInput('missing-evaluation','immediate','missing'));
  await expectDomainError('missing expectation normalized','contradiction_input_expectation_missing',normalizePersistedContradictionInputRecord({...makeInput('pg-follow','follow_through','a3'),expectationId:'missing-expectation'}));
  await expectDomainError('invalid stage normalized','invalid_contradiction_input_stage',normalizePersistedContradictionInputRecord({...makeInput('pg-follow','follow_through','a3'),assessmentStage:'invalid-stage'}));
  await expectDomainError('empty asset normalized','invalid_contradiction_input_asset',normalizePersistedContradictionInputRecord({...makeInput('pg-follow','follow_through','a3'),asset:''}));
  await expectDomainError('empty assessment hash normalized','invalid_contradiction_input_assessment_hash',normalizePersistedContradictionInputRecord({...makeInput('pg-follow','follow_through','a3'),assessmentEvidenceHash:''}));
  await expectDomainError('availability cutoff normalized','contradiction_input_available_after_cutoff',normalizePersistedContradictionInputRecord({...makeInput('pg-follow','follow_through','a3'),availableAt:'2026-01-01T02:00:00.000Z'}));
  await expectDomainError('creation cutoff normalized','contradiction_input_created_after_cutoff',normalizePersistedContradictionInputRecord({...makeInput('pg-follow','follow_through','a3'),createdAt:'2026-01-01T02:00:00.000Z'}));
  await expectedConstraint('contradiction_action_protocol_inputs_payload_hash_key',()=>pool.query(`INSERT INTO contradiction_action_protocol_inputs SELECT 'payload-conflict','pg-follow',expectation_id,asset,'follow_through','a3',available_at,evidence_cutoff_at,normalized_input_hash,provider_reliability_supplied,source_independence_verified,provenance_classes,warnings,limitations,canonical_payload,canonical_payload_hash,created_at FROM contradiction_action_protocol_inputs WHERE record_id=$1`,[stored.recordId]));
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM contradiction_action_protocol_inputs WHERE record_id='payload-conflict'")).rows[0].count,0,'canonical payload conflict leaves no partial input row');
  const followInput=await inputRepo.saveContradictionInput(makeInput('pg-follow','follow_through','a3'));
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM contradiction_action_protocol_inputs')).rows[0].count,3,'three evaluations persist three contradiction inputs with equivalent normalized market content');

  const protocolRepo=new SqlContradictionActionProtocolRepository(pool);
  const protocolRecord=(id,evaluation,inputId,stage,order,previous=null)=>({protocolDecisionId:id,policyVersion:'contradiction-action-protocol-v1',sourceEventEvaluationId:evaluation.eventEvaluationId,sourceExpectationId:'pg-exp',sourceContradictionInputId:inputId,sourceAnalogRetrievalId:null,sourceCognitionSnapshotIds:[],sourceAsset:'xau_usd',sourceReleaseId:'pg-release',sourceReleaseVersion:'v1',sourceAssessmentStage:stage,sourceAssessmentStageOrder:order,eventInstanceKey:'pg-exp:pg-release:v1:xau_usd',contradictionEvidenceHash:`contradiction-${id}`,invalidationStateHash:`invalidation-${id}`,analogContextHash:null,evidenceCutoffAt:'2026-01-01T01:00:00.000Z',evidenceSufficiency:order===1?'provisional':order===3?'resolved':'sufficient',protocolState:order===1?'wait_for_confirmation':order===3?'archive_resolved':'review_required',transitionReasons:order===1?['non_final_assessment']:order===3?['final_resolved_non_actionable']:['material_contradiction'],reviewPrompts:[],blockedActionClasses:['trade_execution','position_entry','position_exit','position_sizing','leverage_selection','stop_placement','target_placement'],warnings:[],limitations:[],deterministicRationale:'Persisted governance rationale.',sourceEvidenceReferences:[],contradictionEvidence:{},invalidationEvidence:{},analogContext:{},provenance:{},previousDecision:previous,createdAt:evaluation.createdAt,canonicalPayloadHash:`payload-${id}`});
  const immediateRecord=protocolRecord('pg-decision-immediate',evaluations[0],stored.recordId,'immediate',1);
  await protocolRepo.saveProtocolRecord(immediateRecord);
  const successorA=protocolRecord('pg-decision-confirmation-a',evaluations[1],confirmationInput.recordId,'confirmation',2,{previousProtocolDecisionId:immediateRecord.protocolDecisionId,transitionId:'pg-transition-a',supersedes:true});
  const successorB=protocolRecord('pg-decision-confirmation-b',evaluations[1],confirmationInput.recordId,'confirmation',2,{previousProtocolDecisionId:immediateRecord.protocolDecisionId,transitionId:'pg-transition-b',supersedes:true});
  const race=await Promise.allSettled([protocolRepo.saveProtocolRecord(successorA),protocolRepo.saveProtocolRecord(successorB)]);
  assert.equal(race.filter((result)=>result.status==='fulfilled').length,1,'exactly one competing successor commits');
  const winner=race.find((result)=>result.status==='fulfilled').value;
  const loser=winner.protocolDecisionId===successorA.protocolDecisionId?successorB:successorA;
  const rejected=race.find((result)=>result.status==='rejected');
  assert.equal(rejected.reason.message,'protocol_supersession_fork','losing competing successor receives deterministic fork error');
  assert.equal(await protocolRepo.getProtocolRecordById(loser.protocolDecisionId),null,'losing fork parent absent');
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM contradiction_action_protocol_evidence_refs WHERE protocol_decision_id=$1',[loser.protocolDecisionId])).rows[0].count,0,'losing fork evidence absent');
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM contradiction_action_protocol_transitions WHERE next_protocol_decision_id=$1',[loser.protocolDecisionId])).rows[0].count,0,'losing fork transition absent');
  const expectProtocolError=async(label,message,record)=>assert.rejects(()=>protocolRepo.saveProtocolRecord(record),(error)=>error instanceof Error&&error.message===message,label);
  await expectProtocolError('SQL same-stage successor rejection','evidence_stage_regression',{...protocolRecord('pg-same-stage',evaluations[1],confirmationInput.recordId,'confirmation',2,{previousProtocolDecisionId:winner.protocolDecisionId,transitionId:'pg-same-stage-transition',supersedes:true})});
  await expectProtocolError('SQL cross-expectation rejection','cross_expectation_supersession_rejected',{...protocolRecord('pg-cross-expectation',evaluations[2],followInput.recordId,'follow_through',3,{previousProtocolDecisionId:winner.protocolDecisionId,transitionId:'pg-cross-expectation-transition',supersedes:true}),sourceExpectationId:'other-expectation'});
  await expectProtocolError('SQL cross-release rejection','cross_release_supersession_rejected',{...protocolRecord('pg-cross-release',evaluations[2],followInput.recordId,'follow_through',3,{previousProtocolDecisionId:winner.protocolDecisionId,transitionId:'pg-cross-release-transition',supersedes:true}),sourceReleaseId:'other-release'});
  await expectProtocolError('SQL cross-version rejection','cross_release_version_supersession_rejected',{...protocolRecord('pg-cross-version',evaluations[2],followInput.recordId,'follow_through',3,{previousProtocolDecisionId:winner.protocolDecisionId,transitionId:'pg-cross-version-transition',supersedes:true}),sourceReleaseVersion:'v2'});
  await expectProtocolError('SQL cross-asset rejection','cross_event_supersession_rejected',{...protocolRecord('pg-cross-asset',evaluations[2],followInput.recordId,'follow_through',3,{previousProtocolDecisionId:winner.protocolDecisionId,transitionId:'pg-cross-asset-transition',supersedes:true}),sourceAsset:'eur_usd'});
  await expectProtocolError('SQL event-instance rejection','cross_event_supersession_rejected',{...protocolRecord('pg-cross-event',evaluations[2],followInput.recordId,'follow_through',3,{previousProtocolDecisionId:winner.protocolDecisionId,transitionId:'pg-cross-event-transition',supersedes:true}),eventInstanceKey:'other-event'});
  await expectProtocolError('SQL confirmation-to-immediate regression','evidence_stage_regression',protocolRecord('pg-regression',evaluations[0],stored.recordId,'immediate',1,{previousProtocolDecisionId:winner.protocolDecisionId,transitionId:'pg-regression-transition',supersedes:true}));
  await expectProtocolError('SQL missing previous rejection','previous_protocol_decision_missing',protocolRecord('pg-missing-previous',evaluations[2],followInput.recordId,'follow_through',3,{previousProtocolDecisionId:'missing-decision',transitionId:'pg-missing-transition',supersedes:true}));
  await expectProtocolError('SQL second successor rejection','protocol_supersession_fork',protocolRecord('pg-second-successor',evaluations[2],followInput.recordId,'follow_through',3,{previousProtocolDecisionId:immediateRecord.protocolDecisionId,transitionId:'pg-second-successor-transition',supersedes:true}));
  const followRecord=protocolRecord('pg-decision-follow',evaluations[2],followInput.recordId,'follow_through',3,{previousProtocolDecisionId:winner.protocolDecisionId,transitionId:'pg-transition-follow',supersedes:true});
  await protocolRepo.saveProtocolRecord(followRecord);
  const history=await protocolRepo.listProtocolRecordsForEventInstance(immediateRecord.eventInstanceKey);
  assert.deepEqual(history.map((record)=>record.protocolDecisionId),[immediateRecord.protocolDecisionId,winner.protocolDecisionId,followRecord.protocolDecisionId],'three-record PostgreSQL protocol history');
  assert.equal(history.at(-1).protocolState,'archive_resolved','terminal SQL archive record');
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM contradiction_action_protocol_transitions')).rows[0].count,2,'two SQL protocol transitions persist');
  for(const record of history) assert.deepEqual(await protocolRepo.saveProtocolRecord(record),record,'all SQL protocol records replay immutably');
  console.log('IFP-3 PostgreSQL three-stage lifecycle, input constraints, and competing-successor race passed');
} finally { await pool.end(); }
