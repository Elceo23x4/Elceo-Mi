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
  asset: string;
  ticker: string;
  startDate: string | null;
  endDate: string | null;
  frequency: string | null;
  requestedAt: string;
};

export type TiingoFixtureResponse = {
  request: TiingoPriceHistoryRequest;
  bars: TiingoPriceBar[];
};
