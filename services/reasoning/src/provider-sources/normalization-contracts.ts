import type { MarketDataProviderDescriptor, NormalizedMarketEvidencePayload, ProviderSourceRequest, ProviderSourceResponse } from '@elceo/types';
export type ProviderManagedExecution = { signal:AbortSignal; timeoutMs:number };
export type MarketEvidenceProviderAdapter = { descriptor: MarketDataProviderDescriptor; fetch(request: ProviderSourceRequest): Promise<ProviderSourceResponse>; fetchManaged?(request:ProviderSourceRequest,execution:ProviderManagedExecution):Promise<ProviderSourceResponse>; normalize(response: ProviderSourceResponse): Promise<NormalizedMarketEvidencePayload[]>; };
