export const COT_REPORT_KINDS = ['legacy_futures_only','disaggregated','traders_in_financial_futures'] as const;
export type CotReportKind = (typeof COT_REPORT_KINDS)[number];

export type CotReportRow = {
  reportDate: string;
  marketName: string;
  cftcMarketCode: string | null;
  exchangeName: string | null;
  asset: string | null;
  openInterest: number;
  commercialLong: number | null;
  commercialShort: number | null;
  nonCommercialLong: number | null;
  nonCommercialShort: number | null;
  nonCommercialSpreading: number | null;
  producerMerchantLong?: number | null;
  producerMerchantShort?: number | null;
  swapDealerLong?: number | null;
  swapDealerShort?: number | null;
  swapDealerSpreading?: number | null;
  managedMoneyLong?: number | null;
  managedMoneyShort?: number | null;
  managedMoneySpreading?: number | null;
  otherReportablesSpreading?: number | null;
  dealerLong: number | null;
  dealerShort: number | null;
  assetManagerLong: number | null;
  assetManagerShort: number | null;
  leveragedFundsLong: number | null;
  leveragedFundsShort: number | null;
  otherReportablesLong: number | null;
  otherReportablesShort: number | null;
};

export type CotFixtureRequest = { asset: string | null; reportKind: CotReportKind; requestedAt: string; region: string | null; };
export type CotFixtureResponse = { request: CotFixtureRequest; rows: CotReportRow[]; };
