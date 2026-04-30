import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryExternalBillingCustomerRepository, MemoryExternalBillingEventRepository, MemoryExternalBillingSubscriptionRepository, MemoryProviderPlanMappingRepository } from '../persistence/payment-provider-repository';
import { ProviderPlanMapper } from '../payment-providers/plan-mapper';
import { PaymentProviderQueryService } from '../payment-providers/query-service';
import { ExternalEventReplayService } from '../payment-providers/replay';

test('payment provider repository ordering and lookups', async () => {
  const customers = new MemoryExternalBillingCustomerRepository();
  const subscriptions = new MemoryExternalBillingSubscriptionRepository();
  const events = new MemoryExternalBillingEventRepository();
  const mappings = new MemoryProviderPlanMappingRepository();
  await customers.saveCustomer({ externalCustomerId: 'c1', providerKind: 'stripe', subjectKind: 'user', subjectId: 'u1', email: null, metadataJson: '{}', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' });
  assert.equal((await customers.getCustomer('stripe', 'c1'))?.subjectId, 'u1');

  await subscriptions.saveSubscription({ externalSubscriptionId: 's2', externalCustomerId: 'c1', providerKind: 'stripe', subjectKind: 'user', subjectId: 'u1', externalPriceId: null, externalProductId: null, mappedPlanKind: 'premium', providerStatus: 'active', cancelAtPeriodEnd: false, currentPeriodStart: null, currentPeriodEnd: null, trialStartsAt: null, trialEndsAt: null, metadataJson: '{}', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-03T00:00:00Z' });
  await subscriptions.saveSubscription({ externalSubscriptionId: 's1', externalCustomerId: 'c1', providerKind: 'stripe', subjectKind: 'user', subjectId: 'u1', externalPriceId: null, externalProductId: null, mappedPlanKind: 'premium', providerStatus: 'active', cancelAtPeriodEnd: false, currentPeriodStart: null, currentPeriodEnd: null, trialStartsAt: null, trialEndsAt: null, metadataJson: '{}', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-03T00:00:00Z' });
  const orderedSubs = await subscriptions.listSubscriptionsForSubject('user', 'u1');
  assert.deepEqual(orderedSubs.map((s) => s.externalSubscriptionId), ['s1', 's2']);
  assert.equal((await subscriptions.getLatestSubscriptionForSubject('user', 'u1'))?.externalSubscriptionId, 's1');

  await events.saveEvent({ externalEventId: 'e2', providerKind: 'stripe', kind: 'subscription_updated', externalCustomerId: 'c1', externalSubscriptionId: 's1', subjectKind: 'user', subjectId: 'u1', occurredAt: '2026-01-04T00:00:00Z', payloadJson: '{"b":1}', processed: false, processingResultCode: null, createdAt: '2026-01-04T00:00:00Z', updatedAt: '2026-01-04T00:00:00Z' });
  await events.saveEvent({ externalEventId: 'e1', providerKind: 'stripe', kind: 'subscription_updated', externalCustomerId: 'c1', externalSubscriptionId: 's1', subjectKind: 'user', subjectId: 'u1', occurredAt: '2026-01-04T00:00:00Z', payloadJson: '{"a":1}', processed: false, processingResultCode: null, createdAt: '2026-01-04T00:00:00Z', updatedAt: '2026-01-04T00:00:00Z' });
  assert.deepEqual((await events.listEventsForSubject('user', 'u1')).map((e) => e.externalEventId), ['e1', 'e2']);
  assert.deepEqual((await events.listUnprocessedEvents()).map((e) => e.externalEventId), ['e1', 'e2']);
  await events.markProcessed('stripe', 'e1', 'ok', '2026-01-05T00:00:00Z');
  assert.deepEqual((await events.listUnprocessedEvents()).map((e) => e.externalEventId), ['e2']);

  await mappings.upsertPlanMapping({ providerKind: 'stripe', externalPriceId: 'p2', mappedPlanKind: 'premium', interval: 'monthly', updatedAt: '2026-01-02T00:00:00Z' });
  await mappings.upsertPlanMapping({ providerKind: 'manual_test', externalPriceId: 'p1', mappedPlanKind: 'free', interval: 'custom', updatedAt: '2026-01-01T00:00:00Z' });
  assert.deepEqual((await mappings.listPlanMappings()).map((m) => `${m.providerKind}:${m.externalPriceId}`), ['manual_test:p1', 'stripe:p2']);

  const query = new PaymentProviderQueryService(customers, subscriptions, events, mappings);
  assert.equal((await query.getExternalSubscription('stripe', 's1'))?.externalSubscriptionId, 's1');
  const mapper = new ProviderPlanMapper(mappings);
  assert.equal((await mapper.mapExternalPriceId('stripe', 'p2'))?.mappedPlanKind, 'premium');
});

test('external event replay serialization failure surfaces', async () => {
  const events = new MemoryExternalBillingEventRepository();
  await events.saveEvent({ externalEventId: 'e1', providerKind: 'stripe', kind: 'unknown', externalCustomerId: null, externalSubscriptionId: null, subjectKind: 'user', subjectId: 'u1', occurredAt: '2026-01-04T00:00:00Z', payloadJson: '{bad', processed: false, processingResultCode: null, createdAt: '2026-01-04T00:00:00Z', updatedAt: '2026-01-04T00:00:00Z' });
  const replay = new ExternalEventReplayService(events);
  await assert.rejects(() => replay.getExternalEventReplay('stripe', 'e1'));
});
