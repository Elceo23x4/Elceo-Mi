import assert from 'node:assert/strict';
import { validateScheduledIngestionJobPolicy, validateScheduledIngestionRunRecord } from '@elceo/schemas';
import { MemoryNormalizedMarketEvidencePayloadRepository, MemoryProviderSourceRequestRepository, MemoryProviderSourceResponseRepository } from '../persistence/market-evidence-ingestion-repository.js';
import { MemoryScheduledIngestionRunRepository } from '../persistence/scheduled-ingestion-repository.js';
import { IngestionPersistenceService } from '../provider-sources/ingestion-persistence-service.js';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary.js';
import { computeNextRetryAt, deserializeScheduledIngestionRunRecord, deriveRetryStatus, deriveStalenessStatus, getDefaultScheduledIngestionPolicies, ScheduledIngestionService, serializeScheduledIngestionRunRecord } from '../scheduled-ingestion/index.js';

export async function runScheduledIngestionTests(){
  const policies=getDefaultScheduledIngestionPolicies();
  assert.ok(policies.length>=16);
  assert.ok(policies.every((x)=>x.rationale.trim().length>0));
  assert.ok(policies.every((x)=>x.enabled===true && x.runMode==='dry_run_fixture'));
  assert.equal(new Set(policies.map((x)=>x.jobId)).size,policies.length);
  assert.ok(validateScheduledIngestionJobPolicy(policies[0]).ok);
  assert.equal(validateScheduledIngestionJobPolicy({}).ok,false);
  assert.equal(deriveRetryStatus('failed',0,1),'retry_scheduled');
  assert.equal(computeNextRetryAt('2026-01-01T00:00:00.000Z',1,30),'2026-01-01T00:01:00.000Z');
  assert.equal(deriveStalenessStatus('2026-01-01T00:00:00.000Z','2026-01-01T00:01:00.000Z',5,15),'fresh');
  assert.equal(deriveStalenessStatus('2026-01-01T00:00:00.000Z','2026-01-01T00:10:00.000Z',5,15),'stale');
  assert.equal(deriveStalenessStatus('2026-01-01T00:00:00.000Z','2026-01-01T00:20:00.000Z',5,15),'expired');

  const reqRepo=new MemoryProviderSourceRequestRepository(); const resRepo=new MemoryProviderSourceResponseRepository(); const payRepo=new MemoryNormalizedMarketEvidencePayloadRepository(); const runRepo=new MemoryScheduledIngestionRunRepository();
  const svc=new ScheduledIngestionService(new IngestionPersistenceService(reqRepo,resRepo,payRepo),runRepo);
  const tiJob='sched-tiingo_market_data-market_price_history-eur_usd'; const cotJob='sched-cftc_cot-cot_report-eur_usd';
  const ti=await svc.runScheduledIngestionDryRun(tiJob,'2026-01-01T00:00:00.000Z'); assert.ok(ti.run.payloadCount>0); assert.ok(ti.run.requestId);
  const cot=await svc.runScheduledIngestionDryRun(cotJob,'2026-01-02T00:00:00.000Z'); assert.ok(cot.run.payloadCount>0);
  const blocked=await svc.runScheduledIngestionJob(tiJob,'production_live','2026-01-03T00:00:00.000Z'); assert.equal(blocked.run.status,'blocked');
  const unknown=await svc.runScheduledIngestionDryRun('missing','2026-01-04T00:00:00.000Z'); assert.equal(unknown.run.status,'skipped');
  assert.ok(validateScheduledIngestionRunRecord(ti.run).ok); assert.equal(validateScheduledIngestionRunRecord({runId:'x'}).ok,false);
  const rows=await runRepo.listRunsByProvider('tiingo_market_data'); assert.equal(rows[0]?.startedAt,'2026-01-03T00:00:00.000Z');
  const round=deserializeScheduledIngestionRunRecord(serializeScheduledIngestionRunRecord(ti.run)); assert.equal(round.runId,ti.run.runId);
  let malformed=false; try{deserializeScheduledIngestionRunRecord('{');}catch{malformed=true;} assert.equal(malformed,true);
  const replay=await svc.getScheduledIngestionRunReplay(ti.run.runId); assert.equal(replay?.runId,ti.run.runId);

  const replayExec=await svc.replayScheduledIngestionRun(ti.run.runId,'dry_run_fixture','2026-01-06T00:00:00.000Z');
  assert.equal(replayExec.run.replayOfRunId,ti.run.runId);
  assert.equal(replayExec.run.originalJobId,ti.run.jobId);
  assert.equal(replayExec.run.originalExecutionMode,'dry_run_fixture');
  assert.equal(replayExec.run.replayMode,'dry_run_fixture');
  assert.equal(replayExec.run.status,'succeeded');
  assert.ok(replayExec.run.runId.includes('-replay-'));
  const replayMissing=await svc.replayScheduledIngestionRun('run-missing','dry_run_fixture','2026-01-07T00:00:00.000Z');
  assert.equal(replayMissing.run.status,'blocked');
  assert.equal(replayMissing.run.errorCode,'unknown_replay_run_id');
  const replayLiveModeBlocked=await svc.replayScheduledIngestionRun(ti.run.runId,'production_live','2026-01-08T00:00:00.000Z');
  assert.equal(replayLiveModeBlocked.run.status,'blocked');
  assert.equal(replayLiveModeBlocked.run.errorCode,'unsupported_replay_mode');
  assert.equal(replayLiveModeBlocked.run.operatorNote,'replay_blocked:unsupported_replay_mode');


  const boundary = new CanonicalMarketIntelligenceBoundaryService({} as never, {} as never, reqRepo, resRepo, payRepo, runRepo);
  const bRun=await boundary.runScheduledIngestionDryRun(tiJob,'2026-01-05T00:00:00.000Z'); assert.equal(bRun.run.providerId,'tiingo_market_data');
  const byId=await boundary.getScheduledIngestionRunById(bRun.run.runId); assert.equal(byId?.runId,bRun.run.runId);
  const byStatus=await boundary.listScheduledIngestionRunsByStatus('succeeded'); assert.ok(byStatus.length>0);
  const rep=await boundary.getScheduledIngestionRunReplay(bRun.run.runId); assert.equal(rep?.runId,bRun.run.runId);
  const boundaryReplay=await boundary.replayScheduledIngestionRun(bRun.run.runId,'dry_run_fixture','2026-01-09T00:00:00.000Z'); assert.equal(boundaryReplay.run.replayOfRunId,bRun.run.runId);
}
