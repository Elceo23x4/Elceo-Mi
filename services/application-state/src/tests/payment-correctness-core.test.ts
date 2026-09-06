import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { InternalPaymentRuntime, MemoryInternalPaymentRepository, SQLInternalPaymentRepository, createInternalPaymentRepository, createMemoryPaymentStore, type FakeProviderOutcome, type InternalPaymentRepository, type InternalPaymentOperation } from '../billing/internal-payment';
import { StripeSandboxPaymentProviderAdapter, parseStripeWebhookEvent, verifyStripeWebhookSignature, normalizeStripeProviderPayload, redactProviderPayload, secretLikeValuesFound, resolvePaymentProviderMode } from '../payment-providers/sandbox-adapter';
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
  const rawBody = JSON.stringify({ id:'evt_rc_i2_valid', type:'checkout.session.completed', created:1700000000, data:{ object:{ id:'cs_rc_i2', payment_intent:'pi_rc_i2', amount_total:2000, currency:'usd', payment_status:'paid', metadata:{ operationId:'ipo_rc_i2' } } } });
  const signatureTimestamp=String(Math.floor(Date.now()/1000));
  const signature = `t=${signatureTimestamp},v1=${createHmac('sha256','whsec_rc_i2_fixture_secret').update(`${signatureTimestamp}.${rawBody}`).digest('hex')}`;
  assert.throws(() => verifyStripeWebhookSignature(rawBody, null, 'whsec_rc_i2_fixture_secret'), /missing_provider_webhook_signature/, 'missing sandbox provider signature rejected');
  assert.throws(() => verifyStripeWebhookSignature(rawBody, 't=1700000000,v1=00', 'whsec_rc_i2_fixture_secret'), /invalid_provider_webhook_signature/, 'wrong sandbox provider signature rejected');
  assert.equal(verifyStripeWebhookSignature(rawBody, signature, 'whsec_rc_i2_fixture_secret'), true, 'valid sandbox provider signature accepted');
  const normalizedFixture = parseStripeWebhookEvent(rawBody, signature, 'whsec_rc_i2_fixture_secret');
  assert.equal(normalizedFixture.providerKind, 'stripe', 'canonical payment provider discovered as stripe-compatible');
  assert.equal(normalizedFixture.providerSessionReference, 'cs_rc_i2', 'webhook event normalization carries session reference');
  assert.equal(normalizedFixture.providerPaymentReference, 'pi_rc_i2', 'webhook event normalization carries payment reference');
  assert.equal(normalizedFixture.status, 'succeeded', 'webhook event normalization maps success');
  const legacySubscription=normalizeStripeProviderPayload({id:'evt_legacy',api_version:'2024-06-20',type:'customer.subscription.updated',data:{object:{id:'sub_legacy',status:'active',current_period_start:1700000000,current_period_end:1702592000}}},null);
  assert.equal(legacySubscription.providerApiVersion,'2024-06-20');
  assert.equal(legacySubscription.currentPeriodEnd,'2023-12-14T22:13:20.000Z');
  const basilSubscription=normalizeStripeProviderPayload({id:'evt_basil',api_version:'2025-03-31.basil',type:'customer.subscription.updated',data:{object:{id:'sub_basil',status:'active',items:{data:[{current_period_start:1700000000,current_period_end:1702592000}]}}}},null);
  assert.equal(basilSubscription.currentPeriodEnd,'2023-12-14T22:13:20.000Z');
  assert.throws(()=>normalizeStripeProviderPayload({id:'evt_ambiguous',type:'customer.subscription.updated',data:{object:{id:'sub_multi',status:'active',items:{data:[{current_period_start:1,current_period_end:2},{current_period_start:3,current_period_end:4}]}}}},null),/ambiguous_subscription_period/);
  const invoice=normalizeStripeProviderPayload({id:'evt_invoice',type:'invoice.paid',data:{object:{id:'in_1',subscription:'sub_1',current_period_start:1700000000,current_period_end:1702592000}}},null);
  assert.equal(invoice.currentPeriodEnd,null,'invoice fields are not treated as authoritative subscription periods');
  const invoiceLine=normalizeStripeProviderPayload({id:'evt_invoice_line',type:'invoice.paid',data:{object:{id:'in_2',subscription:'sub_1',lines:{data:[{period:{start:1700000000,end:1702592000}}]}}}},null);
  assert.equal(invoiceLine.currentPeriodEnd,'2023-12-14T22:13:20.000Z','single invoice subscription line supplies service-period truth');
  assert.throws(()=>resolvePaymentProviderMode({APP_ENV:'staging'}),/payment_provider_mode_invalid/);
  const saved={APP_ENV:process.env.APP_ENV,APP_STATE_REPOSITORY:process.env.APP_STATE_REPOSITORY,DATABASE_URL:process.env.DATABASE_URL};process.env.APP_ENV='staging';process.env.APP_STATE_REPOSITORY='memory';delete process.env.DATABASE_URL;assert.throws(()=>createInternalPaymentRepository(),/payment_persistence_unavailable/);Object.assign(process.env,saved);
  assert.throws(()=>resolvePaymentProviderMode({PAYMENT_PROVIDER_MODE:'production_provider'}),/production_payment_provider_blocked/,'production provider mode defaults blocked');
  const redacted = redactProviderPayload({ tokenHeader:'Bearer example_redacted_value', nested:{ hookValue:'example_redacted_hook_value' } });
  assert.equal(secretLikeValuesFound(redacted), false, 'redacted provider payload contains no secret-like values');
  const refund = normalizeStripeProviderPayload({ id:'evt_refund', type:'charge.refunded', data:{ object:{ id:'ch_refund', payment_intent:'pi_refund', amount:2000, currency:'usd', status:'succeeded' } } }, 'req_refund');
  assert.equal(refund.refundOrReversalOrChargeback, 'refund', 'refund represented in normalized event');
  assert.equal(normalizeStripeProviderPayload({ id:'evt_paid', type:'checkout.session.completed', data:{ object:{ id:'cs_paid', payment_intent:'pi_paid', amount_total:2000, currency:'usd', payment_status:'paid', metadata:{ operationId:'ipo_paid', providerIdempotencyKey:'pik_paid', subjectUserId:'user_paid' } } } }, 'req_paid').status, 'succeeded', 'checkout.session.completed paid maps to success');
  assert.notEqual(normalizeStripeProviderPayload({ id:'evt_unpaid', type:'checkout.session.completed', data:{ object:{ id:'cs_unpaid', payment_intent:'pi_unpaid', amount_total:2000, currency:'usd', payment_status:'unpaid', metadata:{ operationId:'ipo_unpaid', providerIdempotencyKey:'pik_unpaid', subjectUserId:'user_unpaid' } } } }, 'req_unpaid').status, 'succeeded', 'checkout.session.completed unpaid does not map to success');
  assert.equal(normalizeStripeProviderPayload({ id:'evt_async_ok', type:'checkout.session.async_payment_succeeded', data:{ object:{ id:'cs_async_ok', payment_intent:'pi_async_ok', payment_status:'paid' } } }, 'req_async_ok').status, 'succeeded', 'async payment succeeded maps to success');
  assert.equal(normalizeStripeProviderPayload({ id:'evt_async_fail', type:'checkout.session.async_payment_failed', data:{ object:{ id:'cs_async_fail', payment_intent:'pi_async_fail', payment_status:'unpaid' } } }, 'req_async_fail').status, 'failed', 'async payment failed maps to failure');
  assert.equal(normalizeStripeProviderPayload({ id:'evt_pi_ok', type:'payment_intent.succeeded', data:{ object:{ id:'pi_ok', status:'succeeded' } } }, 'req_pi_ok').status, 'succeeded', 'payment_intent.succeeded maps to success');
  assert.equal(normalizeStripeProviderPayload({ id:'evt_pi_fail', type:'payment_intent.payment_failed', data:{ object:{ id:'pi_fail', status:'failed' } } }, 'req_pi_fail').status, 'failed', 'payment_intent.payment_failed maps to failure');
  const unpaidRepo = new MemoryInternalPaymentRepository(createMemoryPaymentStore());
  const unpaidRt = new InternalPaymentRuntime('replay_provider_event', unpaidRepo);
  const unpaidOp = await unpaidRt.checkout({ subjectUserId:'unpaid_user', targetPlan:'focus_plan', amount:2000, currency:'USD', businessIdempotencyKey:'unpaid_intent', outcome:'accepted_response_lost' });
  await unpaidRt.webhook({ eventId:'evt_unpaid_safe', kind:'unknown_result', operationId:unpaidOp.operation.internalPaymentOperationId, providerPaymentReference:'pi_unpaid' });
  const unpaidCounts = await unpaidRt.counts();
  assert.equal(unpaidCounts.entitlements, 0, 'checkout.session.completed unpaid does not grant entitlement');
  assert.equal(unpaidCounts.ledger, 0, 'checkout.session.completed unpaid does not write success ledger');
  await unpaidRt.webhook({ eventId:'evt_unpaid_safe', kind:'unknown_result', operationId:unpaidOp.operation.internalPaymentOperationId, providerPaymentReference:'pi_unpaid' });
  assert.equal((await unpaidRt.counts()).inbox, unpaidCounts.inbox, 'duplicate unpaid/processing provider event is deduped');
  assert.notEqual((await unpaidRepo.getOperation(unpaidOp.operation.internalPaymentOperationId))?.state, 'succeeded', 'signed unknown/processing event does not become success');

  const originalFetch = globalThis.fetch;
  const observedIdempotencyKeys:string[] = [];
  const observedCheckoutBodies:string[]=[];
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    observedIdempotencyKeys.push(String((init?.headers as Record<string,string>)['Idempotency-Key'])); observedCheckoutBodies.push(String(init?.body));
    return new Response(JSON.stringify({ id:'cs_sandbox_test', object:'checkout.session', payment_intent:'pi_sandbox_test', amount_total:2000, currency:'usd', payment_status:'unpaid', metadata:{ operationId:'ipo_sandbox_test', providerIdempotencyKey:'pik_sandbox_test', subjectUserId:'sandbox_user' }, url:'https://checkout.stripe.test/session' }), { status:200, headers:{ 'request-id':'req_sandbox_test', 'content-type':'application/json' } });
  }) as typeof fetch;
  try {
    const adapter = new StripeSandboxPaymentProviderAdapter({ providerKind:'stripe', secretKey:'sk_test_unit_safe', publicKey:'pk_test_unit_safe', webhookSecret:'whsec_unit_safe', productId:'prod_unit_safe' });
    const session = await adapter.createCheckoutOrPaymentSession({ subjectUserId:'sandbox_user', targetPlan:'focus_plan', amount:2000, currency:'USD', providerIdempotencyKey:'pik_sandbox_test', operationId:'ipo_sandbox_test' });
    assert.equal(observedIdempotencyKeys[0], 'pik_sandbox_test', 'sandbox checkout uses provider idempotency key as Stripe Idempotency-Key');
    assert.match(observedCheckoutBodies[0]!,/mode=subscription/);
    assert.match(observedCheckoutBodies[0]!,/subscription_data%5Bmetadata%5D%5BtargetPlan%5D=focus_plan/);
    assert.equal(session.providerSessionReference, 'cs_sandbox_test', 'sandbox checkout adapter returns session reference');
    assert.notEqual(session.status, 'succeeded', 'unpaid sandbox checkout session is not success');
  } finally { globalThis.fetch = originalFetch; }

  const sandboxRepo = new MemoryInternalPaymentRepository(createMemoryPaymentStore());
  const sandboxCreated = await sandboxRepo.createOrReuseOperation({ subjectUserId:'sandbox_user', targetPlan:'focus_plan', amount:2000, currency:'USD', businessIdempotencyKey:'sandbox_intent', provider:'stripe' });
  const sandboxAttached = await sandboxRepo.recordProviderAccepted(sandboxCreated.operation.internalPaymentOperationId, 'pi_sandbox_test', 'cs_sandbox_test');
  assert.equal(sandboxAttached.providerCheckoutSessionReference, 'cs_sandbox_test', 'sandbox checkout persists provider session reference');
  const sandboxRetry = await sandboxRepo.createOrReuseOperation({ subjectUserId:'sandbox_user', targetPlan:'focus_plan', amount:2000, currency:'USD', businessIdempotencyKey:'sandbox_intent', provider:'stripe' });
  assert.equal(sandboxRetry.operation.providerIdempotencyKey, sandboxCreated.operation.providerIdempotencyKey, 'sandbox checkout retry reuses same provider idempotency key');

  const repo = new MemoryInternalPaymentRepository(createMemoryPaymentStore());
  const idRepo=new MemoryInternalPaymentRepository(createMemoryPaymentStore());const idA=await idRepo.createOrReuseOperation({subjectUserId:'id_user',targetPlan:'focus_plan',billingInterval:'monthly',amount:1,currency:'USD',businessIdempotencyKey:'id_a',provider:'test'});const idB=await idRepo.createOrReuseOperation({subjectUserId:'id_user',targetPlan:'focus_plan',billingInterval:'yearly',amount:1,currency:'USD',businessIdempotencyKey:'id_b',provider:'test'});assert.notEqual(idA.operation.internalPaymentOperationId,idB.operation.internalPaymentOperationId);assert.match(idA.operation.internalPaymentOperationId,/^ipo_[0-9a-f-]{36}$/);
  const rt = new InternalPaymentRuntime('local_fake_provider', repo);
  const base={subjectUserId:'user_1',targetPlan:'focus_plan',amount:2000,currency:'USD',businessIdempotencyKey:'intent_1'};
  const [a,b]=await Promise.all([rt.checkout(base),rt.checkout(base)]);
  assert.equal(a.operation.internalPaymentOperationId,b.operation.internalPaymentOperationId,'rapid double click / concurrent checkout reuses operation');
  assert.equal(a.operation.providerIdempotencyKey,b.operation.providerIdempotencyKey,'retry reuses provider idempotency key');
  assert.equal((await rt.counts()).operations,1,'one durable operation per intention');
  assert.equal((await rt.counts()).providerCharges,1,'provider idempotency produces one charge despite concurrent attempts');
  await rt.webhook({eventId:'evt_success_1',kind:'success',operationId:a.operation.internalPaymentOperationId,providerPaymentReference:a.operation.providerPaymentReference,payload:{providerCustomerReference:'cus_initial',providerSubscriptionReference:'sub_initial',subscriptionState:'active',currentPeriodStart:'2026-08-01T00:00:00.000Z',currentPeriodEnd:'2026-09-01T00:00:00.000Z',cancelAtPeriodEnd:false}});
  const persistedInitial=await repo.getOperation(a.operation.internalPaymentOperationId);
  assert.equal(persistedInitial?.providerCustomerReference,'cus_initial','initial webhook persists customer lifecycle field');
  assert.equal(persistedInitial?.providerSubscriptionReference,'sub_initial','initial webhook persists subscription lifecycle field');
  assert.equal(persistedInitial?.currentPeriodEnd,'2026-09-01T00:00:00.000Z','initial webhook persists subscription period');
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

  if (process.env.ELCEO_PAYMENT_REPLAY_SKIP_CHECKSUM_PROBE !== '1') {
  const badFixtureDir = mkdtempSync(join(tmpdir(), 'elceo-rc-i2-replay-'));
  const badFixturePath = join(badFixtureDir, 'bad-replay.json');
  writeFileSync(badFixturePath, JSON.stringify({ suite:'bad', samples:[{ providerKind:'stripe', sampleKind:'replay_fixture', capturedAt:'2026-07-09T00:00:00.000Z', requestId:'req_bad', providerPaymentReference:'pi_bad', providerSessionReference:'cs_bad', providerEventId:'evt_bad', eventType:'checkout.session.completed', amount:2000, currency:'USD', status:'succeeded', rawPayload:{ id:'evt_bad', type:'checkout.session.completed', data:{ object:{ id:'cs_bad', payment_intent:'pi_bad', amount_total:2000, currency:'usd', payment_status:'paid', metadata:{ operationId:'ipo_bad', providerIdempotencyKey:'pik_bad', subjectUserId:'user_bad' } } } }, expectedNormalized:{ providerKind:'stripe', providerPaymentReference:'pi_bad', providerSessionReference:'cs_bad', providerEventId:'evt_bad', providerEventType:'checkout.session.completed', amount:2000, currency:'USD', status:'succeeded', refundOrReversalOrChargeback:'none', metadataOperationId:'ipo_bad', metadataProviderIdempotencyKey:'pik_bad', metadataSubjectUserId:'user_bad' }, rawPayloadChecksum:'bad_checksum', normalizedPayloadChecksum:'bad_checksum', redactionProof:'sanitized_redacted_payload_only', secretLikeValuesFound:false }] }));
  assert.throws(() => execFileSync('node', ['scripts/payment-provider-replay-smoke.mjs'], { env:{ ...process.env, ELCEO_PAYMENT_REPLAY_FIXTURE_PATH: badFixturePath }, stdio:'pipe' }), /Command failed/, 'replay smoke fails checksum mismatch');
  }
}
