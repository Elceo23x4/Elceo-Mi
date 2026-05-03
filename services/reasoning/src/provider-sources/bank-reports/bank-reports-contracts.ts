export type BankReportsFixtureCapability = 'bank_health_metric' | 'bank_earnings_report';
export type BankReportsFixtureRequest = { providerId: string; region: string | null; institution: string | null; capability: BankReportsFixtureCapability; requestedAt: string; };
export type BankHealthMetricRow = { institution: string; region: string; reportDate: string; metricName: string; value: number; unit: string; };
export type BankEarningsMetricRow = { institution: string; region: string; reportDate: string; fiscalPeriod: string; metricName: string; value: number; unit: string; };
export type BankReportsFixtureResponse = { request: BankReportsFixtureRequest; healthRows: BankHealthMetricRow[]; earningsRows: BankEarningsMetricRow[]; };
