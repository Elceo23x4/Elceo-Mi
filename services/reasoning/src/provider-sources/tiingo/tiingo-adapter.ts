import type { MarketEvidenceProviderAdapter, ProviderManagedExecution } from '../normalization-contracts';
import type { ProviderSourceRequest, ProviderSourceResponse } from '@elceo/types';
import type { TiingoFixtureResponse, TiingoPriceBar, TiingoPriceHistoryRequest } from './tiingo-contracts';
import { TIINGO_FIXTURES } from './fixtures';
import { mapAssetToTiingoTicker, normalizeTiingoPriceBars, TIINGO_PROVIDER_ID } from './tiingo-normalizer';
import { getProviderDescriptor } from '../provider-capability-registry';

const SUPPORTED_CAPABILITIES = new Set(['market_price_history', 'end_of_day_prices', 'intraday_quotes']);
export type TiingoAdapterMode = 'fixture' | 'live_disabled' | 'live_enabled';
export type TiingoRuntimeConfig = { mode?: TiingoAdapterMode; liveEnabled?: boolean; apiKey?: string | null; baseUrl?: string | null; timeoutMs?: number | null; fetchImpl?: typeof fetch };
export type TiingoProviderHealth = { providerId: string; configured: boolean; liveEnabled: boolean; mode: TiingoAdapterMode; hasApiKey: boolean; baseUrl: string; timeoutMs: number; capabilityStatus: 'configured'|'disabled'|'missing_api_key'|'invalid_config'; reasons: string[] };

export function resolveTiingoConfig(config: TiingoRuntimeConfig = {}): { mode: TiingoAdapterMode; liveEnabled: boolean; baseUrl: string; timeoutMs: number; apiKey: string | null; fetchImpl: typeof fetch } {
  const liveEnabled = config.liveEnabled ?? false;
  const mode = config.mode ?? (liveEnabled ? 'live_enabled' : 'live_disabled');
  const baseUrl = config.baseUrl?.trim() || 'https://api.tiingo.com';
  const timeoutMs = config.timeoutMs && Number.isFinite(config.timeoutMs) && config.timeoutMs > 0 ? config.timeoutMs : 10000;
  return { mode, liveEnabled, apiKey: config.apiKey ?? null, baseUrl, timeoutMs, fetchImpl: config.fetchImpl ?? fetch };
}
export function getTiingoProviderHealth(config: TiingoRuntimeConfig = {}): TiingoProviderHealth {
  const resolved = resolveTiingoConfig(config); const reasons: string[] = []; let capabilityStatus: TiingoProviderHealth['capabilityStatus'] = 'configured';
  if (!resolved.baseUrl.startsWith('http://') && !resolved.baseUrl.startsWith('https://')) { capabilityStatus='invalid_config'; reasons.push('invalid_base_url'); }
  if (resolved.mode === 'fixture') { capabilityStatus='disabled'; reasons.push('fixture_mode'); }
  else if (!resolved.liveEnabled || resolved.mode === 'live_disabled') { capabilityStatus='disabled'; reasons.push('live_disabled'); }
  else if (!resolved.apiKey) { capabilityStatus='missing_api_key'; reasons.push('missing_api_key'); }
  return { providerId: TIINGO_PROVIDER_ID, configured: capabilityStatus==='configured', liveEnabled: resolved.liveEnabled, mode: resolved.mode, hasApiKey: Boolean(resolved.apiKey), baseUrl: resolved.baseUrl, timeoutMs: resolved.timeoutMs, capabilityStatus, reasons };
}

export class TiingoMarketDataAdapter implements MarketEvidenceProviderAdapter {
  public readonly descriptor = getProviderDescriptor(TIINGO_PROVIDER_ID) ?? (() => { throw new Error('missing_tiingo_descriptor'); })();
  constructor(private readonly config: TiingoRuntimeConfig = {}) {}

  async fetch(request: ProviderSourceRequest): Promise<ProviderSourceResponse> { return this.fetchInternal(request); }
  async fetchManaged(request:ProviderSourceRequest,execution:ProviderManagedExecution):Promise<ProviderSourceResponse>{return this.fetchInternal(request,execution);}
  private async fetchInternal(request:ProviderSourceRequest,execution?:ProviderManagedExecution):Promise<ProviderSourceResponse> {
    const cfg = resolveTiingoConfig(this.config);
    if (!SUPPORTED_CAPABILITIES.has(request.capability)) return { ...baseResponse(request), status: 'unsupported', rawPayloadJson: null, errorCode: 'unsupported_capability', errorMessage: `Unsupported capability: ${request.capability}` };
    if (request.asset === null) return { ...baseResponse(request), status: 'failed', rawPayloadJson: null, errorCode: 'missing_asset', errorMessage: 'Asset is required for tiingo fetch' };
    if (cfg.mode === 'fixture') {
      const fixture = TIINGO_FIXTURES[request.asset];
      if (!fixture) return { ...baseResponse(request), status: 'empty', rawPayloadJson: JSON.stringify({ request: buildTiingoRequest(request), bars: [] }), errorCode: null, errorMessage: null };
      return { ...baseResponse(request), status: 'success', rawPayloadJson: JSON.stringify(fixture), errorCode: null, errorMessage: null };
    }
    if (cfg.mode === 'live_disabled' || !cfg.liveEnabled) return { ...baseResponse(request), status: 'failed', rawPayloadJson: null, errorCode: 'tiingo_live_disabled', errorMessage: 'Live Tiingo fetch is disabled' };
    if (!cfg.apiKey) return { ...baseResponse(request), status: 'failed', rawPayloadJson: null, errorCode: 'missing_api_key', errorMessage: 'TIINGO_API_KEY required for live mode' };
    const live = await fetchLiveTiingoBars(buildTiingoRequest(request), cfg, execution);
    if (live.ok) return { ...baseResponse(request), status: 'success', rawPayloadJson: JSON.stringify(live.payload), sourceUrl: live.sourceUrl, errorCode: null, errorMessage: null };
    const failed = live as { ok: false; errorCode: string; errorMessage: string };
    return { ...baseResponse(request), status: 'failed', rawPayloadJson: null, errorCode: failed.errorCode, errorMessage: failed.errorMessage };
  }

  async normalize(response: ProviderSourceResponse) { if (response.rawPayloadJson === null || response.rawPayloadJson.trim()==='') return []; const parsed = JSON.parse(response.rawPayloadJson) as TiingoFixtureResponse; if (!parsed || !parsed.request || !Array.isArray(parsed.bars)) throw new Error('tiingo_malformed_payload'); return normalizeTiingoPriceBars(parsed.request, parsed.bars as TiingoPriceBar[], response.providerId).payloads; }
}
async function fetchLiveTiingoBars(request: TiingoPriceHistoryRequest, cfg: ReturnType<typeof resolveTiingoConfig>, managed?:ProviderManagedExecution): Promise<{ok:true;payload:TiingoFixtureResponse;sourceUrl:string}|{ok:false;errorCode:string;errorMessage:string}> {
  const url = `${cfg.baseUrl.replace(/\/$/, '')}/tiingo/daily/${encodeURIComponent(request.ticker)}/prices`;
  const controller=managed?null:new AbortController();const timer=managed?null:setTimeout(()=>controller!.abort(),cfg.timeoutMs);const signal=managed?.signal??controller!.signal;
  try { const response = await cfg.fetchImpl(url, { signal, headers: { Authorization: `Token ${cfg.apiKey ?? ''}` } }); if (!response.ok) return { ok:false, errorCode:'tiingo_http_error', errorMessage:`HTTP ${response.status}`}; const json = await response.json() as unknown; if (!Array.isArray(json)) return { ok:false, errorCode:'tiingo_malformed_live_payload', errorMessage:'Expected array payload'}; return { ok:true, payload:{ request, bars: json as TiingoPriceBar[] }, sourceUrl:url }; }
  catch (error) { if (error instanceof Error && error.name === 'AbortError') return { ok:false, errorCode:'tiingo_timeout', errorMessage:'Tiingo request timed out' }; return { ok:false, errorCode:'tiingo_fetch_error', errorMessage:'Tiingo request failed' }; }
  finally { if(timer)clearTimeout(timer); }
}
function buildTiingoRequest(request: ProviderSourceRequest): TiingoPriceHistoryRequest { return { asset: request.asset ?? 'unknown', ticker: mapAssetToTiingoTicker(request.asset ?? 'unknown'), startDate: null, endDate: null, frequency: 'daily', requestedAt: request.requestedAt }; }
function baseResponse(request: ProviderSourceRequest): ProviderSourceResponse { return { requestId: request.requestId, providerId: request.providerId, capability: request.capability, status: 'failed', fetchedAt: request.requestedAt, sourceUrl: null, rawPayloadJson: null, errorCode: null, errorMessage: null }; }
