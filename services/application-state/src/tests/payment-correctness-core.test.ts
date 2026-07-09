import assert from 'node:assert/strict';
import { InternalPaymentRuntime, MemoryInternalPaymentRepository, SQLInternalPaymentRepository, createMemoryPaymentStore, type FakeProviderOutcome, type InternalPaymentRepository, type InternalPaymentOperation } from '../billing/internal-payment';
import { __setDbPoolFactoryForTests, closeDbPool } from '../db/client';


class TransactionProbeRepository extends MemoryInternalPaymentRepository {
  failLedger = false;
  failEntitlement = false;
  failAudit = false;
  constructor(){ super(createMemoryPaymentStore()); }
  async transaction<T>(fn:(repo:InternalPaymentRepository)=>Promise<T>):Promise<T>{
    const snapshot = {
      operations: new Map([...this.store.operations].map(([k,v]) => [k, { ...v, providerEventReferences: [...v.providerEventReferences], lastProviderComparisonSnapshot: v.lastProviderComparisonSnapshot ? { ...v.lastProviderComparisonSnapshot } : null }])),
      byBusiness: new Map(this.store.byBusiness),
      byProviderKey: new Map(this.store.byProviderKey),
      byPaymentRef: new Map(this.store.byPaymentRef),
      bySessionRef: new Map(this.store.bySessionRef),
      inbox: new Map(this.store.inbox),
      ledger: new Map(this.store.ledger),
      entitlements: new Map(this.store.entitlements),
      audit: [...this.store.audit],
      providerCharges: new Map(this.store.providerCharges)
    };
    try { return await fn(this); } catch (error) { this.store.operations=snapshot.operations; this.store.byBusiness=snapshot.byBusiness; this.store.byProviderKey=snapshot.byProviderKey; this.store.byPaymentRef=snapshot.byPaymentRef; this.store.bySessionRef=snapshot.bySessionRef; this.store.inbox=snapshot.inbox; this.store.ledger=snapshot.ledger; this.store.entitlements=snapshot.entitlements; this.store.audit=snapshot.audit; this.store.providerCharges=snapshot.providerCharges; throw error; }
  }
  async writeLedgerOnce(op:InternalPaymentOperation,kind:'payment_success'|'refund'|'partial_refund'|'reversal'|'chargeback'){ if(this.failLedger) throw new Error('probe_ledger_failure'); return super.writeLedgerOnce(op,kind); }
  async writeEntitlementOnce(op:InternalPaymentOperation,kind:'grant'|'refund'|'partial_refund'|'reversal'|'chargeback'){ if(this.failEntitlement) throw new Error('probe_entitlement_failure'); return super.writeEntitlementOnce(op,kind); }
  async appendAudit(operationId:string|null,message:string,data:Record<string,unknown>){ if(this.failAudit) throw new Error('probe_audit_failure'); return super.appendAudit(operationId,message,data); }
}

async function runSqlTransactionIntegrityTests(): Promise<void> {
  const probe = new TransactionProbeRepository();
  const runtime = new InternalPaymentRuntime('local_fake_provider', probe);
  const op = await runtime.checkout({ subjectUserId:'tx_user', targetPlan:'focus_plan', amount:2000, currency:'USD', businessIdempotencyKey:'tx_webhook', outcome:'accepted' });
  probe.failEntitlement = true;
  await assert.rejects(() => runtime.webhook({ eventId:'tx_evt_fail_entitlement', kind:'success', operationId:op.operation.internalPaymentOperationId, providerPaymentReference:op.operation.providerPaymentReference }), /probe_entitlement_failure/);
  assert.equal((await probe.counts()).inbox, 0, 'webhook inbox rolled back when entitlement insert fails');
  assert.equal((await probe.counts()).ledger, 0, 'webhook ledger rolled back when entitlement insert fails');
  assert.equal((await probe.getOperation(op.operation.internalPaymentOperationId))?.state, 'processing', 'webhook state rolled back when entitlement insert fails');
  probe.failEntitlement = false;
  await runtime.webhook({ eventId:'tx_evt_ok', kind:'success', operationId:op.operation.internalPaymentOperationId, providerPaymentReference:op.operation.providerPaymentReference });
  const afterSuccess = await probe.counts();
  await runtime.webhook({ eventId:'tx_evt_ok', kind:'success', operationId:op.operation.internalPaymentOperationId, providerPaymentReference:op.operation.providerPaymentReference });
  assert.equal((await probe.counts()).ledger, afterSuccess.ledger, 'duplicate event does not partially write ledger');
  assert.equal((await probe.counts()).entitlements, afterSuccess.entitlements, 'duplicate event does not partially write entitlement');

  const reconcileProbe = new TransactionProbeRepository();
  const reconcileRuntime = new InternalPaymentRuntime('local_fake_provider', reconcileProbe);
  const unknown = await reconcileRuntime.checkout({ subjectUserId:'tx_user', targetPlan:'focus_plan', amount:2000, currency:'USD', businessIdempotencyKey:'tx_reconcile', outcome:'accepted_response_lost' });
  await reconcileProbe.rememberProviderCharge(unknown.operation.providerIdempotencyKey,'pay_tx_reconcile');
  reconcileProbe.failAudit = true;
  await assert.rejects(() => reconcileRuntime.reconcile({ operationId:unknown.operation.internalPaymentOperationId }), /probe_audit_failure/);
  assert.equal((await reconcileProbe.counts()).ledger, 0, 'reconciliation ledger rolled back when audit fails');
  assert.equal((await reconcileProbe.counts()).entitlements, 0, 'reconciliation entitlement rolled back when audit fails');
  assert.equal((await reconcileProbe.getOperation(unknown.operation.internalPaymentOperationId))?.state, 'reconciliation_required', 'reconciliation state rolled back when audit fails');

  const calls:string[] = [];
  const txClient = { query: async (sql:string) => { calls.push(`tx:${sql}`); return { rows: [{ c: '0' }] }; }, release: () => { calls.push('release'); } };
  const pool = { query: async (sql:string) => { calls.push(`global:${sql}`); return { rows: [{ c: '0' }] }; }, connect: async () => txClient };
  __setDbPoolFactoryForTests(() => pool);
  await new SQLInternalPaymentRepository().transaction(async (repo) => { await repo.counts(); return null; });
  __setDbPoolFactoryForTests(null);
  await closeDbPool();
  assert.equal(calls.some((c) => c.startsWith('global:')), false, 'SQL repository transaction did not call global pool query');
  assert.ok(calls.some((c) => c.startsWith('tx:BEGIN')), 'SQL repository opened transaction on transaction client');
  assert.ok(calls.some((c) => c.includes('payment_operations')), 'SQL repository methods used transaction client');
}

export async function runPaymentCorrectnessCoreTests(): Promise<void> {
  const repo = new MemoryInternalPaymentRepository(createMemoryPaymentStore());
  const rt = new InternalPaymentRuntime('local_fake_provider', repo);
  const base={subjectUserId:'user_1',targetPlan:'focus_plan',amount:2000,currency:'USD',businessIdempotencyKey:'intent_1'};
  const [a,b]=await Promise.all([rt.checkout(base),rt.checkout(base)]);
  assert.equal(a.operation.internalPaymentOperationId,b.operation.internalPaymentOperationId,'rapid double click / concurrent checkout reuses operation');
  assert.equal(a.operation.providerIdempotencyKey,b.operation.providerIdempotencyKey,'retry reuses provider idempotency key');
  assert.equal((await rt.counts()).operations,1,'one durable operation per intention');
  assert.equal(rt.providerChargeAttempts,1,'one provider charge attempt per intention');
  await rt.webhook({eventId:'evt_success_1',kind:'success',operationId:a.operation.internalPaymentOperationId,providerPaymentReference:a.operation.providerPaymentReference});
  await rt.webhook({eventId:'evt_success_1',kind:'success',operationId:a.operation.internalPaymentOperationId,providerPaymentReference:a.operation.providerPaymentReference});
  assert.equal((await rt.counts()).ledger,1,'duplicate webhook does not duplicate ledger');
  assert.equal((await rt.counts()).entitlements,1,'duplicate webhook does not duplicate entitlement');
  await rt.webhook({eventId:'evt_fail_late',kind:'provider_500_before_accepting',operationId:a.operation.internalPaymentOperationId});
  assert.equal((await repo.getOperation(a.operation.internalPaymentOperationId))?.state,'succeeded','out-of-order failure after success does not revoke entitlement');

  for (const outcome of ['timeout_before_response','accepted_response_lost','disconnect_during_redirect','provider_500_after_accepting','unknown_result'] as FakeProviderOutcome[]) {
    const key=`intent_${outcome}`;
    const first=await rt.checkout({...base,businessIdempotencyKey:key,outcome});
    assert.ok(first.operation.state==='unknown'||first.operation.state==='reconciliation_required','ambiguous outcome is safe state');
    const retry=await rt.checkout({...base,businessIdempotencyKey:key,outcome:'accepted'});
    assert.equal(retry.operation.internalPaymentOperationId,first.operation.internalPaymentOperationId,'retry after unknown reuses operation');
    assert.equal(retry.operation.providerIdempotencyKey,first.operation.providerIdempotencyKey,'retry after unknown reuses provider key');
  }
  const before=rt.providerChargeAttempts;
  await rt.checkout({...base,businessIdempotencyKey:'intent_timeout_before_response'});
  assert.equal(rt.providerChargeAttempts,before,'unknown/reconciliation_required retry does not create second charge');

  const beforeFail=await rt.checkout({...base,businessIdempotencyKey:'intent_500_before',outcome:'provider_500_before_accepting'});
  assert.equal(beforeFail.operation.state,'failed','provider 500 before accepting is failed without charge');
  const afterFail=await rt.checkout({...base,businessIdempotencyKey:'intent_500_after',outcome:'provider_500_after_accepting'});
  assert.equal(afterFail.operation.state,'reconciliation_required','provider 500 after accepting requires reconciliation');

  const early=await rt.checkout({...base,businessIdempotencyKey:'intent_webhook_before_redirect',outcome:'accepted_response_lost'});
  const ref=await repo.getProviderCharge(early.operation.providerIdempotencyKey);
  await rt.webhook({eventId:'evt_before_redirect',kind:'success',operationId:early.operation.internalPaymentOperationId,providerPaymentReference:ref});
  assert.equal((await repo.getOperation(early.operation.internalPaymentOperationId))?.state,'succeeded','webhook before redirect completion succeeds operation');

  const race=await rt.checkout({...base,businessIdempotencyKey:'intent_race',outcome:'accepted_response_lost'});
  await repo.rememberProviderCharge(race.operation.providerIdempotencyKey,'pay_race');
  await Promise.all([rt.webhook({eventId:'evt_race_success',kind:'success',operationId:race.operation.internalPaymentOperationId,providerPaymentReference:'pay_race'}),rt.reconcile({operationId:race.operation.internalPaymentOperationId})]);
  const countsAfterRace=await rt.counts();
  await rt.reconcile({operationId:race.operation.internalPaymentOperationId});
  assert.equal((await rt.counts()).ledger,countsAfterRace.ledger,'webhook/reconciliation race and retry do not duplicate ledger');
  assert.equal((await rt.counts()).entitlements,countsAfterRace.entitlements,'webhook/reconciliation race and retry do not duplicate entitlement');

  const restartRepo = new MemoryInternalPaymentRepository(createMemoryPaymentStore());
  const firstProcess = new InternalPaymentRuntime('local_fake_provider', restartRepo);
  const restart=await firstProcess.checkout({...base,businessIdempotencyKey:'intent_restart',outcome:'disconnect_during_redirect'});
  const secondProcess = new InternalPaymentRuntime('local_fake_provider', restartRepo);
  const restarted=await secondProcess.checkout({...base,businessIdempotencyKey:'intent_restart'});
  assert.equal(restarted.operation.internalPaymentOperationId,restart.operation.internalPaymentOperationId,'new service instance reuses durable operation state');
  assert.equal(restarted.operation.providerIdempotencyKey,restart.operation.providerIdempotencyKey,'new service instance reuses provider key');
  const attemptsBeforeRestartRetry=secondProcess.providerChargeAttempts;
  await secondProcess.checkout({...base,businessIdempotencyKey:'intent_restart',outcome:'accepted'});
  assert.equal(secondProcess.providerChargeAttempts,attemptsBeforeRestartRetry,'restart retry after unknown does not create second provider charge');
  await secondProcess.webhook({eventId:'evt_restart_success',kind:'success',operationId:restart.operation.internalPaymentOperationId});
  await secondProcess.webhook({eventId:'evt_restart_success',kind:'success',operationId:restart.operation.internalPaymentOperationId});
  const restartCounts=await secondProcess.counts();
  assert.equal(restartCounts.inbox,1,'webhook after restart dedupes existing event');
  assert.equal(restartCounts.ledger,1,'ledger not duplicated after restart');
  assert.equal(restartCounts.entitlements,1,'entitlement not duplicated after restart');

  const failureRepo = new MemoryInternalPaymentRepository(createMemoryPaymentStore());
  failureRepo.setFailAfterProviderSuccess(true);
  const failureRt = new InternalPaymentRuntime('local_fake_provider', failureRepo);
  const failed = await failureRt.checkout({...base,businessIdempotencyKey:'intent_db_fail_after_success',outcome:'accepted'});
  assert.equal(failed.operation.state,'reconciliation_required','repository failure after provider success records reconciliation_required');

  const dupRepo = new MemoryInternalPaymentRepository(createMemoryPaymentStore());
  const dupRt = new InternalPaymentRuntime('local_fake_provider', dupRepo);
  const d1=await dupRt.checkout({...base,businessIdempotencyKey:'intent_dup_ref_1',outcome:'accepted'});
  const d2=await dupRt.checkout({...base,businessIdempotencyKey:'intent_dup_ref_2',outcome:'timeout_before_response'});
  await assert.rejects(() => dupRepo.recordProviderAccepted(d2.operation.internalPaymentOperationId,d1.operation.providerPaymentReference!,'session_other'),/duplicate_provider_payment_reference/);

  await runSqlTransactionIntegrityTests();

  for (const kind of ['refund','partial_refund','reversal','chargeback'] as FakeProviderOutcome[]) {
    const x=await rt.checkout({...base,businessIdempotencyKey:`intent_${kind}`,outcome:'accepted'});
    await rt.webhook({eventId:`evt_success_${kind}`,kind:'success',operationId:x.operation.internalPaymentOperationId,providerPaymentReference:x.operation.providerPaymentReference});
    await rt.webhook({eventId:`evt_${kind}`,kind,operationId:x.operation.internalPaymentOperationId,providerPaymentReference:x.operation.providerPaymentReference});
    assert.equal((await repo.getOperation(x.operation.internalPaymentOperationId))?.state,kind==='refund'?'refunded':kind==='partial_refund'?'partially_refunded':kind==='reversal'?'reversed':kind,'refund/reversal/chargeback represented');
  }
}
