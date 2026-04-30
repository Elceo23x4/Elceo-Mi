import type { BillingExternalProviderKind } from '@elceo/types';
import type { ExternalBillingCustomerRepository, ExternalBillingEventRepository, ExternalBillingSubscriptionRepository, ProviderPlanMappingRepository } from '../persistence';
export class PaymentProviderQueryService {
  constructor(private readonly customers: ExternalBillingCustomerRepository, private readonly subscriptions: ExternalBillingSubscriptionRepository, private readonly events: ExternalBillingEventRepository, private readonly mappings: ProviderPlanMappingRepository) {}
  getExternalCustomer(providerKind: BillingExternalProviderKind, externalCustomerId: string) { return this.customers.getCustomer(providerKind, externalCustomerId); }
  getExternalSubscription(providerKind: BillingExternalProviderKind, externalSubscriptionId: string) { return this.subscriptions.getSubscription(providerKind, externalSubscriptionId); }
  listExternalEventsForSubject(subjectKind: 'user', subjectId: string, limit?: number) { return this.events.listEventsForSubject(subjectKind, subjectId, limit); }
  listUnprocessedExternalEvents(limit?: number) { return this.events.listUnprocessedEvents(limit); }
  listProviderPlanMappings(providerKind?: BillingExternalProviderKind) { return this.mappings.listPlanMappings(providerKind); }
  getLatestExternalSubscriptionForSubject(subjectKind: 'user', subjectId: string, providerKind?: BillingExternalProviderKind) { return this.subscriptions.getLatestSubscriptionForSubject(subjectKind, subjectId, providerKind); }
}
