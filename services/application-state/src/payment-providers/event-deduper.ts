import type { BillingExternalProviderKind } from '@elceo/types';
import type { ExternalBillingEventRepository } from '../persistence';

export class ExternalEventDeduper {
  constructor(private readonly events: ExternalBillingEventRepository) {}

  async check(providerKind: BillingExternalProviderKind, externalEventId: string) {
    const existing = await this.events.getEvent(providerKind, externalEventId);
    return { deduplicated: Boolean(existing), existing };
  }
}
