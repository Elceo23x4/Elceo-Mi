import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import pg from 'pg';

const USER_A = 'USER_A';
const USER_B = 'USER_B';
const base = process.env.DATABASE_URL;
if (!base) throw new Error('DATABASE_URL_required');
const adminUrl = new URL(base); adminUrl.pathname = '/postgres';
const dbName = `elceo_sec_a1_${randomUUID().replaceAll('-', '')}`;
const admin = new pg.Client({ connectionString: adminUrl.toString() });
await admin.connect();
await admin.query(`CREATE DATABASE ${dbName}`);
const url = new URL(base); url.pathname = `/${dbName}`;
const migrationClient = new pg.Client({ connectionString: url.toString() });
let closeApplicationPool = async () => {};
let closeNotificationPool = async () => {};
const proof = {
  ownerScopedSelect: false,
  ownerScopedUpdate: false,
  noWrongOwnerRevision: false,
  journalLifecycleAuthority: false,
  notificationVerificationSubjectBound: false,
  ownershipRaceGuard: false,
  rollbackForeignExact: false
};

let testFailure;
try {
  await migrationClient.connect();
  for (const file of (await readdir('infra/db/schema')).filter((name) => /^\d{4}.*\.sql$/.test(name)).sort()) {
    await migrationClient.query(await readFile(`infra/db/schema/${file}`, 'utf8'));
  }
  await migrationClient.end();
  process.env.DATABASE_URL = url.toString();
  process.env.APP_ENV = 'test';
  process.env.NODE_ENV = 'test';

  const db = await import('../services/application-state/dist-test-cjs/services/application-state/src/db/client.cjs');
  closeApplicationPool = db.closeDbPool;
  const portfolioPersistence = await import('../services/application-state/dist-test-cjs/services/application-state/src/persistence/portfolio-repository.cjs');
  const journalPersistence = await import('../services/application-state/dist-test-cjs/services/application-state/src/persistence/journal-case-repository.cjs');
  const { WatchlistService } = await import('../services/application-state/dist-test-cjs/services/application-state/src/portfolio/watchlist-service.cjs');
  const { PositionService } = await import('../services/application-state/dist-test-cjs/services/application-state/src/portfolio/position-service.cjs');
  const { ActionService } = await import('../services/application-state/dist-test-cjs/services/application-state/src/portfolio/action-service.cjs');
  const { getPortfolioEntityReplay } = await import('../services/application-state/dist-test-cjs/services/application-state/src/portfolio/replay.cjs');
  const { JournalCaseService } = await import('../services/application-state/dist-test-cjs/services/application-state/src/journal/case-service.cjs');
  const { getJournalCaseReplayById } = await import('../services/application-state/dist-test-cjs/services/application-state/src/journal/replay.cjs');
  const notificationPersistence = await import('../services/notifications/dist-test-cjs/services/notifications/src/persistence/sql-notification-repository.cjs');
  closeNotificationPool = notificationPersistence.closeNotificationDbPool;
  const { NotificationTargetManagementService } = await import('../services/notifications/dist-test-cjs/services/notifications/src/management/target-service.cjs');
  const { NotificationVerificationService } = await import('../services/notifications/dist-test-cjs/services/notifications/src/verification/verification-service.cjs');

  const portfolioRepo = new portfolioPersistence.SqlPortfolioRepository();
  const watchlist = new WatchlistService(portfolioRepo);
  const positions = new PositionService(portfolioRepo);
  const actions = new ActionService(portfolioRepo);
  const journalRepo = new journalPersistence.SqlJournalCaseRepository();
  const journal = new JournalCaseService(journalRepo);
  const actorB = { actorKind: 'user', actorId: USER_B, changedAt: '2026-09-03T00:00:00.000Z' };
  const actorA = { actorKind: 'user', actorId: USER_A, changedAt: '2026-09-03T00:01:00.000Z' };

  const watchB = await watchlist.createWatchlistEntry({ entryId:'watch-b', subjectKind:'user', subjectId:USER_B, asset:'XAU/USD', timeframe:'H1', priority:'high', status:'watching', thesisHealth:'stable', note:null, linkedReasoningRunId:null, linkedSnapshotId:null, linkedDriftId:null, linkedJournalCaseId:null }, actorB);
  const positionB = await positions.createProposedPosition({ positionId:'position-b', subjectKind:'user', subjectId:USER_B, asset:'BTC/USD', timeframe:'M15', direction:'long', entryPrice:null, stopLoss:null, takeProfitLevels:[], size:null, thesisHealth:'stable', linkedJournalCaseId:null, linkedReasoningRunId:null, linkedSnapshotId:null, linkedDriftId:null, note:null }, actorB);
  const actionB = await actions.createActionItem({ actionId:'action-b', subjectKind:'user', subjectId:USER_B, kind:'review_thesis', priority:'high', asset:'XAU/USD', timeframe:'H1', headline:'B action', rationale:'B rationale', linkedEntryId:null, linkedPositionId:null, linkedJournalCaseId:null, linkedReasoningRunId:null, linkedNotificationDecisionId:null }, actorB);
  const caseB = await journal.createDraftCase({ identity:{ caseId:'case-b', subjectKind:'user', subjectId:USER_B, asset:'XAU/USD', timeframe:'H1', title:'B case' }, plan:{ direction:'long', thesis:'Foreign contents must never reach lifecycle validation.', setupType:'breakout', conviction:'standard' } }, actorB);

  const portfolioBefore = new Map();
  for (const [kind, id, table] of [['watchlist_entry',watchB.entryId,'app_portfolio_watchlist_entries'],['position',positionB.positionId,'app_portfolio_positions'],['action_item',actionB.actionId,'app_portfolio_action_items']]) {
    portfolioBefore.set(id, (await db.queryDb(`SELECT row_to_json(t)::text AS value FROM ${table} t WHERE ${kind === 'watchlist_entry' ? 'entry_id' : kind === 'position' ? 'position_id' : 'action_id'}=$1`, [id]))[0].value);
    assert.equal(await getPortfolioEntityReplay(portfolioRepo, 'user', USER_A, kind, id), null);
    assert.equal((await portfolioRepo.listRevisionsForEntityForSubject('user', USER_A, kind, id)).length, 0);
  }
  assert.equal(await portfolioRepo.getWatchlistEntryForSubject('user',USER_A,watchB.entryId),null);
  assert.equal(await portfolioRepo.getPositionForSubject('user',USER_A,positionB.positionId),null);
  assert.equal(await portfolioRepo.getActionItemForSubject('user',USER_A,actionB.actionId),null);
  proof.ownerScopedSelect = true;

  const deniedPortfolio = [
    () => watchlist.updateWatchlistEntry('user',USER_A,watchB.entryId,{note:'attack'},actorA),
    () => watchlist.changeWatchlistStatus('user',USER_A,watchB.entryId,'archived',actorA),
    () => watchlist.changeWatchlistThesisHealth('user',USER_A,watchB.entryId,'weakening',actorA),
    () => watchlist.archiveWatchlistEntry('user',USER_A,watchB.entryId,actorA),
    () => watchlist.linkWatchlistEntry('user',USER_A,watchB.entryId,{linkedReasoningRunId:'attack'},actorA),
    () => positions.updatePosition('user',USER_A,positionB.positionId,{note:'attack'},actorA),
    () => positions.openPosition('user',USER_A,positionB.positionId,actorA.changedAt,{},actorA),
    () => positions.reducePosition('user',USER_A,positionB.positionId,{},actorA),
    () => positions.closePosition('user',USER_A,positionB.positionId,actorA.changedAt,{},actorA),
    () => positions.cancelPosition('user',USER_A,positionB.positionId,actorA),
    () => positions.changePositionThesisHealth('user',USER_A,positionB.positionId,'weakening',actorA),
    () => positions.linkPosition('user',USER_A,positionB.positionId,{linkedJournalCaseId:'attack'},actorA),
    () => actions.updateActionItem('user',USER_A,actionB.actionId,{headline:'attack'},actorA),
    () => actions.completeActionItem('user',USER_A,actionB.actionId,actorA.changedAt,actorA),
    () => actions.dismissActionItem('user',USER_A,actionB.actionId,actorA.changedAt,actorA),
    () => actions.linkAction('user',USER_A,actionB.actionId,{linkedJournalCaseId:'attack'},actorA)
  ];
  for (const operation of deniedPortfolio) await assert.rejects(operation, /not_found/);
  for (const [kind, id, table] of [['watchlist_entry',watchB.entryId,'app_portfolio_watchlist_entries'],['position',positionB.positionId,'app_portfolio_positions'],['action_item',actionB.actionId,'app_portfolio_action_items']]) {
    const idColumn = kind === 'watchlist_entry' ? 'entry_id' : kind === 'position' ? 'position_id' : 'action_id';
    assert.equal((await db.queryDb(`SELECT row_to_json(t)::text AS value FROM ${table} t WHERE ${idColumn}=$1`,[id]))[0].value,portfolioBefore.get(id));
    assert.equal((await portfolioRepo.listRevisionsForEntityForSubject('user',USER_B,kind,id)).length,1);
  }
  proof.ownerScopedUpdate = true;
  proof.noWrongOwnerRevision = true;

  const caseBefore=(await db.queryDb(`SELECT row_to_json(t)::text AS value FROM app_journal_cases t WHERE case_id=$1`,[caseB.identity.caseId]))[0].value;
  assert.equal(await journalRepo.getCaseForSubject('user',USER_A,caseB.identity.caseId),null);
  assert.equal(await getJournalCaseReplayById('user',USER_A,caseB.identity.caseId,journalRepo),null);
  const foreignLifecycle = [
    () => journal.planCase('user',USER_A,caseB.identity.caseId,{plan:{thesis:''}},actorA),
    () => journal.markExecuted('user',USER_A,caseB.identity.caseId,{execution:{}},actorA),
    () => journal.adjustExecution('user',USER_A,caseB.identity.caseId,{execution:{}},actorA),
    () => journal.markPartiallyClosed('user',USER_A,caseB.identity.caseId,{closure:{}},actorA),
    () => journal.closeCase('user',USER_A,caseB.identity.caseId,{closure:{}},actorA),
    () => journal.cancelCase('user',USER_A,caseB.identity.caseId,{},actorA),
    () => journal.reviewCase('user',USER_A,caseB.identity.caseId,{review:{}},actorA)
  ];
  for (const operation of foreignLifecycle) await assert.rejects(operation, /journal_case_not_found/);
  assert.equal((await db.queryDb(`SELECT row_to_json(t)::text AS value FROM app_journal_cases t WHERE case_id=$1`,[caseB.identity.caseId]))[0].value,caseBefore);
  assert.equal((await journalRepo.listRevisionsForCaseForSubject('user',USER_B,caseB.identity.caseId)).length,1);
  proof.journalLifecycleAuthority = true;

  const targetRepo = new notificationPersistence.SqlNotificationTargetRepository();
  const verificationRepo = new notificationPersistence.SqlNotificationVerificationRepository();
  const targetManagement = new NotificationTargetManagementService(targetRepo);
  const verification = new NotificationVerificationService({targetRepository:targetRepo,verificationRepository:verificationRepo},{tokenGenerator:()=> 'internal-secret'});
  const targetB = await targetManagement.registerOrUpdateTarget({subjectKind:'user',subjectId:USER_B,channel:'email',targetKind:'email_address',addressJson:'{"email":"b@example.test"}'},'2026-09-03T01:00:00.000Z');
  const pendingB = await verification.issueTargetVerificationForSubject('user',USER_B,targetB.targetId,'2026-09-03T01:01:00.000Z');
  const notificationBefore=(await db.queryDb(`SELECT json_build_object('target',row_to_json(t),'verifications',(SELECT json_agg(v ORDER BY verification_id) FROM app_notification_verifications v WHERE v.target_id=t.target_id))::text AS value FROM app_notification_targets t WHERE target_id=$1`,[targetB.targetId]))[0].value;
  await assert.rejects(()=>targetManagement.enableTargetForSubject('user',USER_A,targetB.targetId),/target_not_found/);
  await assert.rejects(()=>targetManagement.disableTargetForSubject('user',USER_A,targetB.targetId),/target_not_found/);
  await assert.rejects(()=>verification.issueTargetVerificationForSubject('user',USER_A,targetB.targetId),/target_not_found/);
  await assert.rejects(()=>verification.resendTargetVerificationForSubject('user',USER_A,targetB.targetId),/target_not_found/);
  assert.equal((await verification.consumeTargetVerificationForSubject('user',USER_A,targetB.targetId,pendingB.rawToken)).reason,'target_not_found');
  const notificationAfter=(await db.queryDb(`SELECT json_build_object('target',row_to_json(t),'verifications',(SELECT json_agg(v ORDER BY verification_id) FROM app_notification_verifications v WHERE v.target_id=t.target_id))::text AS value FROM app_notification_targets t WHERE target_id=$1`,[targetB.targetId]))[0].value;
  assert.equal(notificationAfter,notificationBefore);
  proof.notificationVerificationSubjectBound = true;

  // Genuine overlapping same-ID creates: PostgreSQL serializes the conflict; exactly one owner and its revision win.
  const raceId='watch-race';
  const makeRaceInput=(subjectId,note)=>({entryId:raceId,subjectKind:'user',subjectId,asset:'EUR/USD',timeframe:'H4',priority:'medium',status:'watching',thesisHealth:'stable',note,linkedReasoningRunId:null,linkedSnapshotId:null,linkedDriftId:null,linkedJournalCaseId:null});
  const raceResults=await Promise.allSettled([
    new WatchlistService(new portfolioPersistence.SqlPortfolioRepository()).createWatchlistEntry(makeRaceInput(USER_A,'A'),actorA),
    new WatchlistService(new portfolioPersistence.SqlPortfolioRepository()).createWatchlistEntry(makeRaceInput(USER_B,'B'),actorB)
  ]);
  assert.equal(raceResults.filter((result)=>result.status==='fulfilled').length,1);
  assert.equal(raceResults.filter((result)=>result.status==='rejected').length,1);
  const raceRow=(await db.queryDb(`SELECT subject_id,note FROM app_portfolio_watchlist_entries WHERE entry_id=$1`,[raceId]))[0];
  const raceRevisions=await db.queryDb(`SELECT changed_by_id,snapshot_json::text FROM app_portfolio_revisions WHERE entity_kind='watchlist_entry' AND entity_id=$1`,[raceId]);
  assert.equal(raceRevisions.length,1);
  assert.equal(raceRevisions[0].changed_by_id,raceRow.subject_id);
  assert.equal(JSON.parse(raceRevisions[0].snapshot_json).subjectId,raceRow.subject_id);
  proof.ownershipRaceGuard = true;

  // Actual transaction rollback after intermediate foreign-domain changes.
  const rollbackBefore=(await db.queryDb(`SELECT json_build_object('case',row_to_json(c),'revisions',(SELECT count(*) FROM app_journal_case_revisions r WHERE r.case_id=c.case_id),'target',row_to_json(t),'verifications',(SELECT json_agg(v ORDER BY verification_id) FROM app_notification_verifications v WHERE v.target_id=t.target_id))::text AS value FROM app_journal_cases c CROSS JOIN app_notification_targets t WHERE c.case_id=$1 AND t.target_id=$2`,[caseB.identity.caseId,targetB.targetId]))[0].value;
  await assert.rejects(()=>db.withDbTransaction(async(tx)=>{
    await tx.query(`UPDATE app_journal_cases SET title='rolled back',subject_id=$2 WHERE case_id=$1`,[caseB.identity.caseId,USER_A]);
    await tx.query(`INSERT INTO app_journal_case_revisions(revision_id,case_id,revision_type,previous_status,next_status,changed_at,changed_by_kind,changed_by_id,summary,snapshot_json) VALUES('rollback-rev',$1,'planned','draft','planned',NOW(),'user',$2,'rollback','{}')`,[caseB.identity.caseId,USER_A]);
    await tx.query(`UPDATE app_notification_targets SET status='active',verified_at=NOW() WHERE target_id=$1`,[targetB.targetId]);
    await tx.query(`UPDATE app_notification_verifications SET status='consumed',attempt_count=attempt_count+1 WHERE target_id=$1`,[targetB.targetId]);
    throw new Error('intentional_rollback');
  }),/intentional_rollback/);
  const rollbackAfter=(await db.queryDb(`SELECT json_build_object('case',row_to_json(c),'revisions',(SELECT count(*) FROM app_journal_case_revisions r WHERE r.case_id=c.case_id),'target',row_to_json(t),'verifications',(SELECT json_agg(v ORDER BY verification_id) FROM app_notification_verifications v WHERE v.target_id=t.target_id))::text AS value FROM app_journal_cases c CROSS JOIN app_notification_targets t WHERE c.case_id=$1 AND t.target_id=$2`,[caseB.identity.caseId,targetB.targetId]))[0].value;
  assert.equal(rollbackAfter,rollbackBefore);
  proof.rollbackForeignExact = true;

  assert(Object.values(proof).every(Boolean));
  console.log(JSON.stringify({suite:'SEC-A1 PostgreSQL adversarial authority',...proof,raceWinner:raceRow.subject_id}));
} catch (error) {
  testFailure = error;
  console.error('SEC-A1 acceptance failure:', error);
} finally {
  try { await closeApplicationPool(); } catch {}
  try { await closeNotificationPool(); } catch {}
  try { await migrationClient.end(); } catch {}
  await new Promise((resolve) => setTimeout(resolve, 100));
  await admin.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
  await admin.end();
}
if (testFailure) throw testFailure;
