import type { MarketEvidenceProviderAdapter } from './normalization-contracts';
import type { NormalizedMarketEvidencePayload, ProviderSourceRequest, ProviderSourceResponse } from '@elceo/types';
import type {
  NormalizedMarketEvidencePayloadRepository,
  ProviderSourceRequestRepository,
  ProviderSourceResponseRepository,
} from '../persistence/market-evidence-ingestion-repository';
import type { ProviderApiGateExecutionResult } from './provider-api-gate';

export type IngestionPersistenceReport = {
  requestId: string;
  providerId: string;
  capability: string;
  responseStatus: ProviderSourceResponse['status'];
  payloadCount: number;
  persistedPayloadIds: string[];
  macroVintageProjectionCount: number;
  errors: string[];
};

/**
 * Source-specific macro projection stays outside the generic ingestion service.
 * Implementations must only project trusted, canonical source/capability pairs and
 * must preserve provider release/vintage semantics instead of fabricating them.
 */
export type MacroVintageProjectionSink = {
  persistProjection(input: {
    request: ProviderSourceRequest;
    response: ProviderSourceResponse;
    payload: NormalizedMarketEvidencePayload;
  }): Promise<'inserted' | 'duplicate' | 'not_applicable'>;
};

export class IngestionPersistenceService {
  constructor(
    private readonly req: ProviderSourceRequestRepository,
    private readonly res: ProviderSourceResponseRepository,
    private readonly pay: NormalizedMarketEvidencePayloadRepository,
    private readonly macroVintageSink?: MacroVintageProjectionSink,
  ) {}

  async persistProviderSourceRequest(request: ProviderSourceRequest) {
    await this.req.saveRequest({ ...request, createdAt: new Date().toISOString() });
  }

  async persistProviderSourceResponse(response: ProviderSourceResponse) {
    await this.res.saveResponse({ ...response, createdAt: new Date().toISOString() });
  }

  async persistNormalizedMarketEvidencePayload(payload: NormalizedMarketEvidencePayload) {
    await this.pay.savePayload({ ...payload, createdAt: new Date().toISOString() });
  }

  async persistIngestionResult(
    request: ProviderSourceRequest,
    response: ProviderSourceResponse,
    payloads: NormalizedMarketEvidencePayload[],
  ): Promise<IngestionPersistenceReport> {
    const errors: string[] = [];
    const ids: string[] = [];
    let macroVintageProjectionCount = 0;

    try {
      await this.persistProviderSourceRequest(request);
    } catch (error) {
      errors.push(String(error));
    }

    try {
      await this.persistProviderSourceResponse(response);
    } catch (error) {
      errors.push(String(error));
    }

    for (const payload of payloads) {
      try {
        await this.persistNormalizedMarketEvidencePayload(payload);
        ids.push(payload.payloadId);
      } catch (error) {
        errors.push(String(error));
      }

      if (this.macroVintageSink) {
        try {
          const result = await this.macroVintageSink.persistProjection({ request, response, payload });
          if (result !== 'not_applicable') macroVintageProjectionCount += 1;
        } catch (error) {
          errors.push(`macro_vintage_projection:${String(error)}`);
        }
      }
    }

    return {
      requestId: request.requestId,
      providerId: request.providerId,
      capability: request.capability,
      responseStatus: response.status,
      payloadCount: payloads.length,
      persistedPayloadIds: ids,
      macroVintageProjectionCount,
      errors,
    };
  }

  async persistProviderApiGateResult(
    adapter: MarketEvidenceProviderAdapter,
    request: ProviderSourceRequest,
    result: ProviderApiGateExecutionResult,
  ) {
    if (!result.decision.allowed || !result.response) throw new Error(result.decision.reason);
    if (result.cacheSnapshot?.payloadPersistence === 'evaluation_no_store') {
      throw new Error('provider_no_store_persistence_forbidden');
    }

    const runtime = result.response;
    const status: ProviderSourceResponse['status'] =
      runtime.payloadSchemaStatus === 'valid'
        ? runtime.recordCount === 0 && runtime.payload === null
          ? 'empty'
          : 'success'
        : 'failed';

    const response: ProviderSourceResponse = {
      requestId: request.requestId,
      providerId: request.providerId,
      capability: request.capability,
      status,
      fetchedAt: runtime.receivedAt,
      sourceUrl: runtime.sourceUrl ?? null,
      rawPayloadJson: runtime.payloadSchemaStatus === 'valid' ? JSON.stringify(runtime.payload) : null,
      errorCode: runtime.error?.category ?? null,
      errorMessage: runtime.error?.message ?? null,
      ...(runtime.rateLimit?.retryAfterMs === undefined ? {} : { retryAfterMs: runtime.rateLimit.retryAfterMs }),
    };

    const payloads = runtime.payloadSchemaStatus === 'valid' ? await adapter.normalize(response) : [];
    return this.persistIngestionResult(request, response, payloads);
  }

  async persistAdapterFetchAndNormalize(adapter: MarketEvidenceProviderAdapter, request: ProviderSourceRequest) {
    const response = await adapter.fetch(request);
    const payloads = await adapter.normalize(response);
    return this.persistIngestionResult(request, response, payloads);
  }
}
