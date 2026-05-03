export type StressConditionsFixtureCapability='credit_stress_indicator'|'financial_conditions_index'|'liquidity_conditions_indicator'|'dollar_liquidity_indicator';
export type StressConditionsFixtureRequest={providerId:string;region:string;capability:StressConditionsFixtureCapability;requestedAt:string;};
export type CreditStressRow={region:string;indicatorName:string;observedAt:string;value:number;unit:string;};
export type FinancialConditionsRow={region:string;observedAt:string;indexName:string;value:number;unit:string|null;};
export type LiquidityConditionRow={region:string;observedAt:string;indicatorName:string;value:number;unit:string;};
export type DollarLiquidityRow={region:string;observedAt:string;indicatorName:string;value:number;unit:string;};
export type StressConditionsFixtureResponse={request:StressConditionsFixtureRequest;creditStressRows:CreditStressRow[];financialConditionsRows:FinancialConditionsRow[];liquidityConditionRows:LiquidityConditionRow[];dollarLiquidityRows:DollarLiquidityRow[];};
