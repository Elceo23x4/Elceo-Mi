import type { MarketDataProviderDescriptor, NormalizedMarketEvidencePayload, ProviderSourceRequest, ProviderSourceResponse } from '@elceo/types';
export type MarketEvidenceProviderAdapter = { descriptor: MarketDataProviderDescriptor; fetch(request: ProviderSourceRequest): Promise<ProviderSourceResponse>; normalize(response: ProviderSourceResponse): Promise<NormalizedMarketEvidencePayload[]>; };
