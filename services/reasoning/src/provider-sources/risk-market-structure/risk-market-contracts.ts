export type RiskMarketFixtureCapability='volatility_surface'|'risk_sentiment_indicator'|'equity_index_breadth_indicator'|'cross_market_rate_series';
export type RiskMarketFixtureRequest={providerId:string;region:string|null;asset:string|null;capability:RiskMarketFixtureCapability;requestedAt:string;};
export type VolatilitySurfaceRow={asset:string;observedAt:string;expiry:string;tenor:string;strikeDelta:number;impliedVolatility:number;};
export type RiskSentimentRow={region:string;observedAt:string;indicatorName:string;value:number;unit:string;};
export type EquityBreadthRow={asset:string;observedAt:string;indicatorName:string;value:number;unit:string;};
export type CrossMarketRateRow={asset:string;observedAt:string;rateName:string;value:number;unit:string;};
export type RiskMarketFixtureResponse={request:RiskMarketFixtureRequest;volatilityRows:VolatilitySurfaceRow[];riskSentimentRows:RiskSentimentRow[];equityBreadthRows:EquityBreadthRow[];crossMarketRateRows:CrossMarketRateRow[];};
