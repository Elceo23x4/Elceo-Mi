export type CryptoEarningsGeopoliticalFixtureCapability = 'crypto_market_structure_indicator'|'earnings_macro_indicator'|'geopolitical_risk_event';
export type CryptoEarningsGeopoliticalFixtureRequest = { providerId: string; region: string | null; asset: string | null; capability: CryptoEarningsGeopoliticalFixtureCapability; requestedAt: string; };
export type CryptoMarketStructureRow = { asset: string; observedAt: string; indicatorName: string; value: number; unit: string; providerId: string | null; };
export type EarningsMacroRow = { institution: string; region: string; reportDate: string; metricName: string; value: number; unit: string; providerId: string | null; };
export type GeopoliticalRiskEventRow = { eventId: string; region: string; occurredAt: string; title: string; severity: 'low'|'medium'|'high'|'critical'; importanceScore: number; relatedAssets: string[]; sourceUrl: string | null; providerId: string | null; };
export type CryptoEarningsGeopoliticalFixtureResponse = { request: CryptoEarningsGeopoliticalFixtureRequest; cryptoRows: CryptoMarketStructureRow[]; earningsRows: EarningsMacroRow[]; geopoliticalRows: GeopoliticalRiskEventRow[]; };
