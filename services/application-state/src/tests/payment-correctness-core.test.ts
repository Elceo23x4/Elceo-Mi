import assert from 'node:assert/strict';
import { InternalPaymentRuntime, type FakeProviderOutcome } from '../billing/internal-payment';

export async function runPaymentCorrectnessCoreTests(): Promise<void> {
  const rt = new InternalPaymentRuntime('local_fake_provider');
  const base={subjectUserId:'user_1',targetPlan:'focus_plan',amount:2000,currency:'USD',businessIdempotencyKey:'intent_1'};
  const [a,b]=await Promise.all([rt.checkout(base),rt.checkout(base)]);
  assert.equal(a.operation.internalPaymentOperationId,b.operation.internalPaymentOperationId,'rapid double click / concurrent checkout reuses operation');
  assert.equal(a.operation.providerIdempotencyKey,b.operation.providerIdempotencyKey,'retry reuses provider idempotency key');
  assert.equal(rt.counts().operations,1,'one operation per intention');
  assert.equal(rt.providerChargeAttempts,1,'one provider charge attempt per intention');
  await rt.webhook({eventId:'evt_success_1',kind:'success',operationId:a.operation.internalPaymentOperationId,providerPaymentReference:a.operation.providerPaymentReference});
  await rt.webhook({eventId:'evt_success_1',kind:'success',operationId:a.operation.internalPaymentOperationId,providerPaymentReference:a.operation.providerPaymentReference});
  assert.equal(rt.counts().ledger,1,'duplicate webhook does not duplicate ledger');
  assert.equal(rt.counts().entitlements,1,'duplicate webhook does not duplicate entitlement');
  await rt.webhook({eventId:'evt_fail_late',kind:'provider_500_before_accepting',operationId:a.operation.internalPaymentOperationId});
  assert.equal(a.operation.state,'succeeded','out-of-order failure after success does not revoke entitlement');

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
  const ref=rt.providerCharges.get(early.operation.providerIdempotencyKey)!;
  await rt.webhook({eventId:'evt_before_redirect',kind:'success',operationId:early.operation.internalPaymentOperationId,providerPaymentReference:ref});
  assert.equal(early.operation.state,'succeeded','webhook before redirect completion succeeds operation');

  const race=await rt.checkout({...base,businessIdempotencyKey:'intent_race',outcome:'accepted_response_lost'});
  rt.providerCharges.set(race.operation.providerIdempotencyKey,'pay_race');
  await Promise.all([rt.webhook({eventId:'evt_race_success',kind:'success',operationId:race.operation.internalPaymentOperationId,providerPaymentReference:'pay_race'}),rt.reconcile({operationId:race.operation.internalPaymentOperationId})]);
  const countsAfterRace=rt.counts();
  await rt.reconcile({operationId:race.operation.internalPaymentOperationId});
  assert.equal(rt.counts().ledger,countsAfterRace.ledger,'webhook/reconciliation race and retry do not duplicate ledger');
  assert.equal(rt.counts().entitlements,countsAfterRace.entitlements,'webhook/reconciliation race and retry do not duplicate entitlement');

  const restart=await rt.checkout({...base,businessIdempotencyKey:'intent_restart',outcome:'disconnect_during_redirect'});
  rt.resetVolatileProcessState();
  const restarted=await rt.checkout({...base,businessIdempotencyKey:'intent_restart'});
  assert.equal(restarted.operation.internalPaymentOperationId,restart.operation.internalPaymentOperationId,'process restart uses durable operation state');

  for (const kind of ['refund','partial_refund','reversal','chargeback'] as FakeProviderOutcome[]) {
    const x=await rt.checkout({...base,businessIdempotencyKey:`intent_${kind}`,outcome:'accepted'});
    await rt.webhook({eventId:`evt_success_${kind}`,kind:'success',operationId:x.operation.internalPaymentOperationId,providerPaymentReference:x.operation.providerPaymentReference});
    await rt.webhook({eventId:`evt_${kind}`,kind,operationId:x.operation.internalPaymentOperationId,providerPaymentReference:x.operation.providerPaymentReference});
    assert.equal(x.operation.state,kind==='refund'?'refunded':kind==='partial_refund'?'partially_refunded':kind==='reversal'?'reversed':kind,'refund/reversal/chargeback represented');
  }
}
