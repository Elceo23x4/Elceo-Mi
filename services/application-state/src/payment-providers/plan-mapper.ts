import type { BillingExternalProviderKind } from '@elceo/types';
import type { ProviderPlanMappingRepository } from '../persistence';
export class ProviderPlanMapper {
  constructor(private readonly mappings: ProviderPlanMappingRepository) {}
  mapExternalPriceId(providerKind: BillingExternalProviderKind, externalPriceId: string) { return this.mappings.getPlanMapping(providerKind, externalPriceId); }
}
