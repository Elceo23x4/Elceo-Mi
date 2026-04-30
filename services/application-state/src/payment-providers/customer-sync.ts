import type { BillingExternalProviderKind } from '@elceo/types';
import type { ExternalBillingCustomerRepository } from '../persistence';
import type { NormalizedExternalEvent } from './stripe-like-normalizer';

export class ExternalCustomerSyncService {
  constructor(private readonly customers: ExternalBillingCustomerRepository) {}

  async sync(providerKind: BillingExternalProviderKind, normalized: NormalizedExternalEvent, nowIso: string) {
    if (!normalized.customer?.subject) return null;
    await this.customers.saveCustomer({
      externalCustomerId: normalized.customer.externalCustomerId,
      providerKind,
      subjectKind: normalized.customer.subject.subjectKind,
      subjectId: normalized.customer.subject.subjectId,
      email: normalized.customer.email,
      metadataJson: normalized.customer.metadataJson,
      createdAt: nowIso,
      updatedAt: nowIso
    });
    return normalized.customer.externalCustomerId;
  }
}
