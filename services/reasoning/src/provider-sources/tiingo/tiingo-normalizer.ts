import type { MarketEvidenceClass, NormalizedMarketEvidencePayload, NormalizedPriceBar } from '@elceo/types';
import { buildMetadataJson, buildNormalizedPayloadId, buildValuesJson, clampConfidenceScore } from '../normalization-helpers';
import type { TiingoPriceBar, TiingoPriceHistoryRequest } from './tiingo-contracts';

export const TIINGO_PROVIDER_ID = 'tiingo_market_data';

const TICKER_MAP: Record<string, string> = {
  xau_usd: 'XAUUSD',
  eur_usd: 'EURUSD',
  btc_usd: 'BTCUSD',
  nasdaq_100: 'QQQ',
  sp500: 'SPY'
};

export function mapAssetToTiingoTicker(asset: string): string {
  return TICKER_MAP[asset] ?? asset.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function mapTiingoFrequencyToTimeframe(frequency: string | null): string {
  if (frequency === 'daily' || frequency === null) return '1d';
  if (frequency === 'weekly') return '1w';
  if (frequency === 'monthly') return '1M';
  if (frequency === 'hourly') return '1h';
  return '1d';
}


export function mapAssetToEvidenceClass(asset: string): MarketEvidenceClass {
  if (asset === 'btc_usd') return 'crypto_market_structure';
  if (asset === 'xau_usd') return 'precious_metals_flows';
  if (asset === 'nasdaq_100' || asset === 'sp500' || asset === 'de30') return 'risk_sentiment';
  return 'cross_market_rates';
}

function assertFiniteBar(bar: TiingoPriceBar): void {
  if (![bar.open, bar.high, bar.low, bar.close].every(Number.isFinite)) {
    throw new Error('tiingo_invalid_ohlc_non_finite');
  }
  if (bar.high < bar.low) {
    throw new Error('tiingo_invalid_ohlc_range');
  }
}

export function buildTiingoPricePayload(request: TiingoPriceHistoryRequest, bar: TiingoPriceBar, providerId = TIINGO_PROVIDER_ID): NormalizedMarketEvidencePayload {
  assertFiniteBar(bar);
  const observedAt = new Date(bar.date).toISOString();
  return {
    payloadId: buildNormalizedPayloadId(providerId, 'market_price_history', observedAt, request.asset),
    evidenceTypeId: 'market_price_history',
    evidenceClass: mapAssetToEvidenceClass(request.asset),
    providerId,
    sourceId: request.ticker,
    region: 'global',
    asset: request.asset,
    observedAt,
    publishedAt: null,
    normalizedAt: request.requestedAt,
    confidenceScore: clampConfidenceScore(90),
    dataQuality: bar.volume === null ? 'medium' : 'high',
    valuesJson: buildValuesJson({ o: bar.open, h: bar.high, l: bar.low, c: bar.close, v: bar.volume }),
    metadataJson: buildMetadataJson({ ticker: request.ticker, frequency: request.frequency, timeframe: mapTiingoFrequencyToTimeframe(request.frequency), source: 'tiingo_fixture', evidenceClass: mapAssetToEvidenceClass(request.asset) })
  };
}

export function normalizeTiingoPriceBars(request: TiingoPriceHistoryRequest, bars: TiingoPriceBar[], providerId = TIINGO_PROVIDER_ID): { priceBars: NormalizedPriceBar[]; payloads: NormalizedMarketEvidencePayload[] } {
  const timeframe = mapTiingoFrequencyToTimeframe(request.frequency);
  const priceBars = bars.map((bar) => {
    assertFiniteBar(bar);
    return { asset: request.asset, timeframe, timestamp: new Date(bar.date).toISOString(), open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume, providerId } satisfies NormalizedPriceBar;
  });
  const payloads = bars.map((bar) => buildTiingoPricePayload(request, bar, providerId));
  return { priceBars, payloads };
}
