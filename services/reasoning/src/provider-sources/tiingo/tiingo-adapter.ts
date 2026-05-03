import type { MarketEvidenceProviderAdapter } from '../normalization-contracts';
import type { ProviderSourceRequest, ProviderSourceResponse } from '@elceo/types';
import type { TiingoFixtureResponse, TiingoPriceBar, TiingoPriceHistoryRequest } from './tiingo-contracts';
import { TIINGO_FIXTURES } from './fixtures';
import { mapAssetToTiingoTicker, normalizeTiingoPriceBars, TIINGO_PROVIDER_ID } from './tiingo-normalizer';
import { getProviderDescriptor } from '../provider-capability-registry';

const SUPPORTED_CAPABILITIES = new Set(['market_price_history', 'end_of_day_prices', 'intraday_quotes']);

export class TiingoMarketDataAdapter implements MarketEvidenceProviderAdapter {
  public readonly descriptor = getProviderDescriptor(TIINGO_PROVIDER_ID) ?? (() => { throw new Error('missing_tiingo_descriptor'); })();

  async fetch(request: ProviderSourceRequest): Promise<ProviderSourceResponse> {
    if (!SUPPORTED_CAPABILITIES.has(request.capability)) {
      return { ...baseResponse(request), status: 'unsupported', rawPayloadJson: null, errorCode: 'unsupported_capability', errorMessage: `Unsupported capability: ${request.capability}` };
    }
    if (request.asset === null) {
      return { ...baseResponse(request), status: 'failed', rawPayloadJson: null, errorCode: 'missing_asset', errorMessage: 'Asset is required for tiingo fixture fetch' };
    }
    const fixture = TIINGO_FIXTURES[request.asset];
    if (!fixture) {
      return { ...baseResponse(request), status: 'empty', rawPayloadJson: JSON.stringify({ request: buildTiingoRequest(request), bars: [] }), errorCode: null, errorMessage: null };
    }
    return { ...baseResponse(request), status: 'success', rawPayloadJson: JSON.stringify(fixture), errorCode: null, errorMessage: null };
  }

  async normalize(response: ProviderSourceResponse) {
    if (response.rawPayloadJson === null || response.rawPayloadJson.trim()==='') return [];
    const parsed = JSON.parse(response.rawPayloadJson) as TiingoFixtureResponse;
    if (!parsed || !parsed.request || !Array.isArray(parsed.bars)) throw new Error('tiingo_malformed_payload');
    const { payloads } = normalizeTiingoPriceBars(parsed.request, parsed.bars as TiingoPriceBar[], response.providerId);
    return payloads;
  }
}

function buildTiingoRequest(request: ProviderSourceRequest): TiingoPriceHistoryRequest {
  return { asset: request.asset ?? 'unknown', ticker: mapAssetToTiingoTicker(request.asset ?? 'unknown'), startDate: null, endDate: null, frequency: 'daily', requestedAt: request.requestedAt };
}

function baseResponse(request: ProviderSourceRequest): ProviderSourceResponse {
  return { requestId: request.requestId, providerId: request.providerId, capability: request.capability, status: 'failed', fetchedAt: request.requestedAt, sourceUrl: null, rawPayloadJson: null, errorCode: null, errorMessage: null };
}
