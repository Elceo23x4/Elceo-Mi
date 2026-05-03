import type { TiingoFixtureResponse } from './tiingo-contracts';

const baseRequestedAt = '2026-01-10T00:00:00.000Z';

export const TIINGO_FIXTURES: Record<string, TiingoFixtureResponse> = {
  xau_usd: {
    request: { asset: 'xau_usd', ticker: 'XAUUSD', startDate: '2026-01-01', endDate: '2026-01-03', frequency: 'daily', requestedAt: baseRequestedAt },
    bars: [
      { date: '2026-01-01T00:00:00.000Z', open: 2050, high: 2062, low: 2042, close: 2058, volume: null, adjOpen: null, adjHigh: null, adjLow: null, adjClose: null, adjVolume: null, divCash: null, splitFactor: null },
      { date: '2026-01-02T00:00:00.000Z', open: 2058, high: 2071, low: 2051, close: 2068, volume: null, adjOpen: null, adjHigh: null, adjLow: null, adjClose: null, adjVolume: null, divCash: null, splitFactor: null }
    ]
  },
  eur_usd: {
    request: { asset: 'eur_usd', ticker: 'EURUSD', startDate: '2026-01-01', endDate: '2026-01-03', frequency: 'daily', requestedAt: baseRequestedAt },
    bars: [
      { date: '2026-01-01T00:00:00.000Z', open: 1.09, high: 1.094, low: 1.086, close: 1.092, volume: 1200000, adjOpen: null, adjHigh: null, adjLow: null, adjClose: null, adjVolume: null, divCash: null, splitFactor: null }
    ]
  },
  btc_usd: {
    request: { asset: 'btc_usd', ticker: 'BTCUSD', startDate: '2026-01-01', endDate: '2026-01-03', frequency: 'daily', requestedAt: baseRequestedAt },
    bars: [
      { date: '2026-01-01T00:00:00.000Z', open: 102000, high: 104500, low: 100800, close: 103200, volume: 24000, adjOpen: null, adjHigh: null, adjLow: null, adjClose: null, adjVolume: null, divCash: null, splitFactor: null }
    ]
  },
  nasdaq_100: {
    request: { asset: 'nasdaq_100', ticker: 'QQQ', startDate: '2026-01-01', endDate: '2026-01-03', frequency: 'daily', requestedAt: baseRequestedAt },
    bars: [
      { date: '2026-01-01T00:00:00.000Z', open: 500.1, high: 505.7, low: 498.9, close: 504.3, volume: 53000000, adjOpen: null, adjHigh: null, adjLow: null, adjClose: null, adjVolume: null, divCash: null, splitFactor: null }
    ]
  }
};
