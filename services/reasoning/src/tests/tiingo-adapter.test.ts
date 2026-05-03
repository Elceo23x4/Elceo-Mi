import { validateNormalizedMarketEvidencePayload, validateNormalizedPriceBar } from '@elceo/schemas';
import type { ProviderSourceRequest } from '@elceo/types';
import { getProviderDescriptor } from '../provider-sources/provider-capability-registry.js';
import { mapAssetToEvidenceClass, mapAssetToTiingoTicker, normalizeTiingoPriceBars, TiingoMarketDataAdapter } from '../provider-sources/tiingo/index.js';

const req = (overrides: Partial<ProviderSourceRequest> = {}): ProviderSourceRequest => ({
  requestId: 'req-tiingo-1', providerId: 'tiingo_market_data', capability: 'market_price_history', asset: 'xau_usd', region: 'global', evidenceTypeId: 'market_price_history', requestedAt: '2026-01-10T00:00:00.000Z', paramsJson: '{}', ...overrides
});

export async function runTiingoAdapterTests(): Promise<void> {
  const adapter = new TiingoMarketDataAdapter();
  const descriptor = getProviderDescriptor('tiingo_market_data');
  if (!descriptor || adapter.descriptor.providerId !== descriptor.providerId) throw new Error('tiingo descriptor mismatch');

  const fetched = await adapter.fetch(req());
  if (fetched.status !== 'success' || fetched.rawPayloadJson === null) throw new Error('tiingo fixture fetch failed');

  const unsupported = await adapter.fetch(req({ capability: 'cot_report' }));
  if (unsupported.status !== 'unsupported') throw new Error('tiingo unsupported capability expected');

  const payloads = await adapter.normalize(fetched);
  if (payloads.length === 0) throw new Error('tiingo normalize empty unexpectedly');
  if (payloads.some((x) => !validateNormalizedMarketEvidencePayload(x).ok)) throw new Error('invalid normalized payload');
  if (payloads[0]?.evidenceClass !== 'precious_metals_flows') throw new Error('xau evidence class mapping failed');

  const parsed = JSON.parse(fetched.rawPayloadJson) as { request: { asset: string; ticker: string; startDate: string | null; endDate: string | null; frequency: string | null; requestedAt: string }; bars: Array<{ date: string; open: number; high: number; low: number; close: number; volume: number | null; adjOpen: null; adjHigh: null; adjLow: null; adjClose: null; adjVolume: null; divCash: null; splitFactor: null }> };
  const normalized = normalizeTiingoPriceBars(parsed.request, parsed.bars);
  if (normalized.priceBars.some((x) => !validateNormalizedPriceBar(x).ok)) throw new Error('normalized price bar invalid');
  const firstPayloadId = normalized.payloads.at(0)?.payloadId;
  const secondPayloadId = normalizeTiingoPriceBars(parsed.request, parsed.bars).payloads.at(0)?.payloadId;
  if (!firstPayloadId || !secondPayloadId || firstPayloadId !== secondPayloadId) throw new Error('payloadId should be deterministic');

  const malformed = { ...fetched, rawPayloadJson: '{"broken": true}' };
  let malformedThrown = false;
  try { await adapter.normalize(malformed); } catch { malformedThrown = true; }
  if (!malformedThrown) throw new Error('malformed payload should throw');


  const firstBar = parsed.bars[0];
  if (!firstBar) throw new Error('fixture bars missing');

  let finiteThrown = false;
  try { normalizeTiingoPriceBars(parsed.request, [{ ...firstBar, open: Number.NaN }]); } catch (e) { finiteThrown = String(e).includes('tiingo_invalid_ohlc_non_finite'); }
  if (!finiteThrown) throw new Error('finite OHLC guard missing');

  let rangeThrown = false;
  try { normalizeTiingoPriceBars(parsed.request, [{ ...firstBar, high: 1, low: 2 }]); } catch (e) { rangeThrown = String(e).includes('tiingo_invalid_ohlc_range'); }
  if (!rangeThrown) throw new Error('high<low guard missing');

  if (mapAssetToEvidenceClass('eur_usd') !== 'cross_market_rates') throw new Error('fx evidence class mapping failed');
  if (mapAssetToEvidenceClass('btc_usd') !== 'crypto_market_structure') throw new Error('btc evidence class mapping failed');
  if (mapAssetToEvidenceClass('nasdaq_100') !== 'risk_sentiment' || mapAssetToEvidenceClass('sp500') !== 'risk_sentiment') throw new Error('equity evidence class mapping failed');
  if (mapAssetToEvidenceClass('xau_usd') !== 'precious_metals_flows') throw new Error('xau evidence class mapping failed');

  if (mapAssetToTiingoTicker('xau_usd') !== 'XAUUSD') throw new Error('xau mapping failed');
  if (mapAssetToTiingoTicker('eur_usd') !== 'EURUSD') throw new Error('eur mapping failed');
  if (mapAssetToTiingoTicker('btc_usd') !== 'BTCUSD') throw new Error('btc mapping failed');
  if (mapAssetToTiingoTicker('nasdaq_100') !== 'QQQ' || mapAssetToTiingoTicker('sp500') !== 'SPY') throw new Error('equity proxy mapping failed');

  if ((adapter.fetch as unknown as { toString(): string }).toString().includes('http')) throw new Error('network path detected');
}
