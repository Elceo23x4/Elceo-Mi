export type RegulatoryLiquidityFixtureCapability='stress_test_result'|'institutional_liquidity_report'|'bank_health_metric'|'regulatory_filing_reference';
export type RegulatoryLiquidityFixtureRequest={providerId:string;region:string|null;institution:string|null;capability:RegulatoryLiquidityFixtureCapability;requestedAt:string;};
export type StressTestResultRow={institution:string;region:string;reportDate:string;scenarioName:string;metricName:string;value:number;unit:string;};
export type RegulatoryFilingRow={filingId:string;institution:string;region:string;filingDate:string;filingType:string;title:string;url:string|null;};
export type InstitutionalLiquidityRow={institution:string;region:string;observedAt:string;metricName:string;value:number;unit:string;};
export type RegulatoryLiquidityFixtureResponse={request:RegulatoryLiquidityFixtureRequest;stressTestRows:StressTestResultRow[];filingRows:RegulatoryFilingRow[];institutionalLiquidityRows:InstitutionalLiquidityRow[];};
