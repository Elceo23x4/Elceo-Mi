export type TiingoPriceBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number | null;
  adjOpen: number | null;
  adjHigh: number | null;
  adjLow: number | null;
  adjClose: number | null;
  adjVolume: number | null;
  divCash: number | null;
  splitFactor: number | null;
};

export type TiingoPriceHistoryRequest = {
  requestId: string;
  asset: string;
  ticker: string;
  startDate: string | null;
  endDate: string | null;
  frequency: string | null;
  requestedAt: string;
  sourceMode: 'fixture' | 'live_staging';
};

export type TiingoAssetFamily = 'fx' | 'crypto';
export type TiingoLiveAsset = { family: TiingoAssetFamily; ticker: string };

export type TiingoFixtureResponse = {
  request: TiingoPriceHistoryRequest;
  bars: TiingoPriceBar[];
};
