import type { BillingPlanSource, ElceoPlanKind } from '@elceo/types';
import type { ProviderPlanMappingRepository } from '../persistence';

export type ProviderPlanMappingInput = { providerKind:'stripe'|'manual_test'|'internal_import'; providerPriceId:string|null; providerProductId:string|null; providerPlanCode:string|null; };
export type ProviderPlanMappingResult = { canonicalPlanKind: ElceoPlanKind; source: BillingPlanSource };

export class BillingProviderPlanMapper {
  constructor(private readonly mappingRepo: ProviderPlanMappingRepository) {}
  async mapPlan(input: ProviderPlanMappingInput): Promise<ProviderPlanMappingResult> {
    if (input.providerPriceId) {
      const m = await this.mappingRepo.getPlanMapping(input.providerKind === 'stripe' ? 'stripe' : 'manual_test', input.providerPriceId);
      if (m) return { canonicalPlanKind: m.mappedPlanKind, source: 'provider_mapping' };
    }
    if (input.providerProductId) {
      const m = await this.mappingRepo.listPlanMappings(input.providerKind === 'stripe' ? 'stripe' : 'manual_test');
      const found = m.find((x) => x.externalPriceId === input.providerProductId);
      if (found) return { canonicalPlanKind: found.mappedPlanKind, source: 'provider_mapping' };
    }
    if (input.providerPlanCode) {
      const lower = input.providerPlanCode.toLowerCase();
      if (lower.includes('premium')) return { canonicalPlanKind: 'premium', source: 'provider_mapping' };
      if (lower.includes('admin')) return { canonicalPlanKind: 'admin_internal', source: 'provider_mapping' };
    }
    return { canonicalPlanKind: 'free', source: 'internal_default' };
  }
}
