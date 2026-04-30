import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryAccountEntitlementRepository, MemoryBillingEventRepository, MemoryBillingSubscriptionRepository, MemoryExternalBillingCustomerRepository, MemoryExternalBillingEventRepository, MemoryExternalBillingSubscriptionRepository, MemoryProviderPlanMappingRepository } from '../persistence';
import { normalizeStripeLikeEnvelope } from '../payment-providers/stripe-like-normalizer';
import { ExternalEventDeduper } from '../payment-providers/event-deduper';
import { ExternalSubscriptionSyncService } from '../payment-providers/subscription-sync';
import { ProviderPlanMapper } from '../payment-providers/plan-mapper';
import { PaymentProviderTranslator } from '../payment-providers/translator';
import { CanonicalBillingBoundaryService } from '../runtime/canonical-billing-boundary';
import { PaymentProviderIngestService } from '../payment-providers/ingest-service';

const mkBilling = () => new CanonicalBillingBoundaryService(new MemoryBillingSubscriptionRepository(), new MemoryBillingEventRepository(), new MemoryAccountEntitlementRepository());

test('normalization known/unknown mapping', () => {
  assert.equal(normalizeStripeLikeEnvelope({ providerKind: 'stripe', externalEventId: 'e1', eventType: 'invoice.payment_failed', createdAt: '2026-01-01T00:00:00Z', dataJson: '{"data":{"object":{}}}' }).kind, 'invoice_payment_failed');
  assert.equal(normalizeStripeLikeEnvelope({ providerKind: 'stripe', externalEventId: 'e2', eventType: 'x.y', createdAt: '2026-01-01T00:00:00Z', dataJson: '{"data":{"object":{}}}' }).kind, 'unknown');
});

test('dedupe deterministic', async () => {
  const events = new MemoryExternalBillingEventRepository();
  await events.saveEvent({ externalEventId: 'e1', providerKind: 'stripe', kind: 'unknown', externalCustomerId: null, externalSubscriptionId: null, subjectKind: null, subjectId: null, occurredAt: '2026-01-01T00:00:00Z', payloadJson: '{}', processed: true, processingResultCode: 'done', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' });
  assert.equal((await new ExternalEventDeduper(events).check('stripe', 'e1')).deduplicated, true);
});

test('translator matrix coverage', async () => {
  const billing = mkBilling();
  const externalSubs = new MemoryExternalBillingSubscriptionRepository();
  const t = new PaymentProviderTranslator(billing, externalSubs);
  await billing.activatePaidPlan('user', 'u1', 'premium', 'monthly', '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z');
  await externalSubs.saveSubscription({ externalSubscriptionId: 'sub1', externalCustomerId: 'cus1', providerKind: 'stripe', subjectKind: 'user', subjectId: 'u1', externalPriceId: 'p1', externalProductId: null, mappedPlanKind: 'premium', providerStatus: 'active', cancelAtPeriodEnd: false, currentPeriodStart: '2026-02-01T00:00:00Z', currentPeriodEnd: '2026-03-01T00:00:00Z', trialStartsAt: null, trialEndsAt: null, metadataJson: '{}', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' });

  assert.equal((await t.translate({ providerKind: 'stripe', externalEventId: 'a', kind: 'invoice_payment_failed', occurredAt: '2026-01-10T00:00:00Z', payloadJson: '{}', externalCustomerId: null, externalSubscriptionId: 'sub1', subject: { subjectKind: 'user', subjectId: 'u1' }, customer: null, subscription: null })).processingResultCode, 'past_due_marked');
  assert.equal((await t.translate({ providerKind: 'stripe', externalEventId: 'b', kind: 'subscription_created', occurredAt: '2026-01-10T00:00:00Z', payloadJson: '{}', externalCustomerId: null, externalSubscriptionId: 'sub1', subject: { subjectKind: 'user', subjectId: 'u1' }, customer: null, subscription: null })).processingResultCode, 'trial_started');
  assert.equal((await t.translate({ providerKind: 'stripe', externalEventId: 'c', kind: 'subscription_created', occurredAt: '2026-01-10T00:00:00Z', payloadJson: '{}', externalCustomerId: null, externalSubscriptionId: 'sub1', subject: { subjectKind: 'user', subjectId: 'u1' }, customer: null, subscription: null })).processingResultCode, 'paid_activated');

  await billing.activatePaidPlan('user', 'u2', 'premium', 'monthly', '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z');
  await externalSubs.saveSubscription({ externalSubscriptionId: 'sub2', externalCustomerId: 'cus2', providerKind: 'stripe', subjectKind: 'user', subjectId: 'u2', externalPriceId: 'p2', externalProductId: null, mappedPlanKind: 'free', providerStatus: 'active', cancelAtPeriodEnd: false, currentPeriodStart: '2026-02-01T00:00:00Z', currentPeriodEnd: '2026-03-01T00:00:00Z', trialStartsAt: null, trialEndsAt: null, metadataJson: '{}', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' });
  assert.equal((await t.translate({ providerKind: 'stripe', externalEventId: 'd', kind: 'subscription_updated', occurredAt: '2026-02-02T00:00:00Z', payloadJson: '{}', externalCustomerId: null, externalSubscriptionId: 'sub2', subject: { subjectKind: 'user', subjectId: 'u2' }, customer: null, subscription: null })).processingResultCode, 'plan_changed');

  await billing.activatePaidPlan('user', 'u3', 'premium', 'monthly', '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z');
  await externalSubs.saveSubscription({ externalSubscriptionId: 'sub3', externalCustomerId: 'cus3', providerKind: 'stripe', subjectKind: 'user', subjectId: 'u3', externalPriceId: 'p3', externalProductId: null, mappedPlanKind: 'premium', providerStatus: 'active', cancelAtPeriodEnd: false, currentPeriodStart: '2026-02-01T00:00:00Z', currentPeriodEnd: '2026-03-01T00:00:00Z', trialStartsAt: null, trialEndsAt: null, metadataJson: '{}', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' });
  assert.equal((await t.translate({ providerKind: 'stripe', externalEventId: 'e', kind: 'subscription_updated', occurredAt: '2026-02-02T00:00:00Z', payloadJson: '{}', externalCustomerId: null, externalSubscriptionId: 'sub3', subject: { subjectKind: 'user', subjectId: 'u3' }, customer: null, subscription: null })).processingResultCode, 'renewed_from_subscription_update');
  assert.equal((await t.translate({ providerKind: 'stripe', externalEventId: 'f', kind: 'subscription_updated', occurredAt: '2026-02-02T00:00:00Z', payloadJson: '{}', externalCustomerId: null, externalSubscriptionId: null, subject: { subjectKind: 'user', subjectId: 'u3' }, customer: null, subscription: null })).processingResultCode, 'subscription_missing');

  await billing.activatePaidPlan('user', 'u4', 'premium', 'monthly', '2026-01-01T00:00:00Z', '2026-02-01T00:00:00Z');
  await externalSubs.saveSubscription({ externalSubscriptionId: 'sub4', externalCustomerId: 'cus4', providerKind: 'stripe', subjectKind: 'user', subjectId: 'u4', externalPriceId: 'p4', externalProductId: null, mappedPlanKind: 'premium', providerStatus: 'canceled', cancelAtPeriodEnd: false, currentPeriodStart: null, currentPeriodEnd: null, trialStartsAt: null, trialEndsAt: null, metadataJson: '{}', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' });
  assert.equal((await t.translate({ providerKind: 'stripe', externalEventId: 'g', kind: 'subscription_deleted', occurredAt: '2026-02-02T00:00:00Z', payloadJson: '{}', externalCustomerId: null, externalSubscriptionId: 'sub4', subject: { subjectKind: 'user', subjectId: 'u4' }, customer: null, subscription: null })).processingResultCode, 'deleted_expired');
  assert.equal((await t.translate({ providerKind: 'stripe', externalEventId: 'h', kind: 'subscription_deleted', occurredAt: '2026-02-02T00:00:00Z', payloadJson: '{}', externalCustomerId: null, externalSubscriptionId: null, subject: { subjectKind: 'user', subjectId: 'u4' }, customer: null, subscription: null })).processingResultCode, 'subscription_missing');

  assert.equal((await t.translate({ providerKind: 'stripe', externalEventId: 'i', kind: 'checkout_completed', occurredAt: '2026-02-02T00:00:00Z', payloadJson: '{}', externalCustomerId: null, externalSubscriptionId: null, subject: { subjectKind: 'user', subjectId: 'u4' }, customer: null, subscription: null })).processingResultCode, 'checkout_sync_only_insufficient_data');
  assert.equal((await t.translate({ providerKind: 'stripe', externalEventId: 'j', kind: 'unknown', occurredAt: '2026-02-02T00:00:00Z', payloadJson: '{}', externalCustomerId: null, externalSubscriptionId: null, subject: { subjectKind: 'user', subjectId: 'u4' }, customer: null, subscription: null })).processingResultCode, 'unhandled_event_kind');
});

test('ingest/replay fidelity and duplicate behavior', async () => {
  const events = new MemoryExternalBillingEventRepository();
  const subs = new MemoryExternalBillingSubscriptionRepository();
  const mappings = new MemoryProviderPlanMappingRepository();
  const ingest = new PaymentProviderIngestService(events, new MemoryExternalBillingCustomerRepository(), subs, mappings, new PaymentProviderTranslator(mkBilling(), subs));
  await mappings.upsertPlanMapping({ providerKind: 'stripe', externalPriceId: 'price_1', mappedPlanKind: 'premium', interval: 'monthly', updatedAt: '2026-01-01T00:00:00Z' });
  const payload = JSON.stringify({ data: { object: { id: 'subx', customer: 'cusx', status: 'active', current_period_start: 1735689600, current_period_end: 1738368000, metadata: { subjectKind: 'user', subjectId: 'ux' }, items: { data: [{ price: { id: 'price_1', product: 'prod_1' } }] } } } });
  const first = await ingest.ingestExternalEvent({ providerKind: 'stripe', externalEventId: 'evt1', eventType: 'customer.subscription.created', createdAt: '2026-01-01T00:00:00Z', dataJson: payload });
  assert.equal(first.deduplicated, false);
  const dup = await ingest.ingestExternalEvent({ providerKind: 'stripe', externalEventId: 'evt1', eventType: 'customer.subscription.created', createdAt: '2026-01-01T00:00:00Z', dataJson: payload });
  assert.equal(dup.deduplicated, true);

  await events.saveEvent({ externalEventId: 'evt_old', providerKind: 'stripe', kind: 'invoice_payment_failed', externalCustomerId: null, externalSubscriptionId: null, subjectKind: 'user', subjectId: 'ux', occurredAt: '2026-01-01T00:00:00Z', payloadJson: '{}', processed: false, processingResultCode: null, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' });
  const replay = await ingest.replayUnprocessedEvents(10);
  assert.equal(replay.length > 0, true);
  assert.equal(replay[0]?.externalEventId, 'evt_old');
  assert.equal((await events.getEvent('stripe', 'evt_old'))?.processingResultCode !== null, true);
});

test('sync mapped/unmapped path integrity', async () => {
  const subs = new MemoryExternalBillingSubscriptionRepository();
  const mappings = new MemoryProviderPlanMappingRepository();
  const sync = new ExternalSubscriptionSyncService(subs, new ProviderPlanMapper(mappings));
  const normalized = normalizeStripeLikeEnvelope({ providerKind: 'stripe', externalEventId: 'e100', eventType: 'customer.subscription.created', createdAt: '2026-01-01T00:00:00Z', dataJson: JSON.stringify({ data: { object: { id: 'sub_100', customer: 'cus_100', status: 'active', metadata: { subjectKind: 'user', subjectId: 'u100' }, items: { data: [{ price: { id: 'missing' } }] } } } }) });
  await sync.sync('stripe', normalized, '2026-01-01T00:00:00Z');
  assert.equal((await subs.getSubscription('stripe', 'sub_100'))?.mappedPlanKind, null);
});
