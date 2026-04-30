import type { BillingExternalProviderKind, BillingProviderPlanMapping, StripeLikeWebhookEnvelope } from '@elceo/types';
import type {
  ExternalBillingCustomerRepository,
  ExternalBillingEventRepository,
  ExternalBillingSubscriptionRepository,
  ProviderPlanMappingRepository
} from '../persistence';
import { PaymentProviderIngestService } from '../payment-providers/ingest-service';
import { PaymentProviderQueryService } from '../payment-providers/query-service';
import { PaymentProviderTranslator } from '../payment-providers/translator';

export class CanonicalPaymentProviderBoundaryService {
  private readonly ingest: PaymentProviderIngestService;
  private readonly query: PaymentProviderQueryService;

  constructor(
    events: ExternalBillingEventRepository,
    customers: ExternalBillingCustomerRepository,
    subscriptions: ExternalBillingSubscriptionRepository,
    mappings: ProviderPlanMappingRepository,
    translator: PaymentProviderTranslator
  ) {
    this.ingest = new PaymentProviderIngestService(events, customers, subscriptions, mappings, translator);
    this.query = new PaymentProviderQueryService(customers, subscriptions, events, mappings);
  }

  ingestExternalEvent(envelope: StripeLikeWebhookEnvelope) { return this.ingest.ingestExternalEvent(envelope); }
  ingestManualEvent(providerKind: BillingExternalProviderKind, externalEventId: string, dataJson: string) { return this.ingest.ingestManualEvent(providerKind, externalEventId, dataJson); }
  replayUnprocessedEvents(limit?: number) { return this.ingest.replayUnprocessedEvents(limit); }
  upsertProviderPlanMapping(mapping: BillingProviderPlanMapping) { return this.ingest.upsertProviderPlanMapping(mapping); }
  listProviderPlanMappings(providerKind?: BillingExternalProviderKind) { return this.query.listProviderPlanMappings(providerKind); }
  getExternalCustomer(providerKind: BillingExternalProviderKind, externalCustomerId: string) { return this.query.getExternalCustomer(providerKind, externalCustomerId); }
  getExternalSubscription(providerKind: BillingExternalProviderKind, externalSubscriptionId: string) { return this.query.getExternalSubscription(providerKind, externalSubscriptionId); }
  listExternalEventsForSubject(subjectKind: 'user', subjectId: string, limit?: number) { return this.query.listExternalEventsForSubject(subjectKind, subjectId, limit); }
  listUnprocessedExternalEvents(limit?: number) { return this.query.listUnprocessedExternalEvents(limit); }
}
