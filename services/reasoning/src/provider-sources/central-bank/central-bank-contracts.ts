export type CentralBankFixtureRequest = { institution: string; region: string; capability: 'central_bank_balance_sheet'|'central_bank_liquidity_operation'|'policy_rate_series'; requestedAt: string; };
export type CentralBankBalanceSheetRow = { institution: string; region: string; observedAt: string; metricName: string; value: number; currency: string | null; unit: string; };
export type CentralBankLiquidityOperationRow = { institution: string; region: string; operationDate: string; operationType: string; amount: number; currency: string; maturityDays: number | null; };
export type PolicyRateRow = { institution: string; region: string; observedAt: string; rateName: string; value: number; };
export type CentralBankFixtureResponse = { request: CentralBankFixtureRequest; balanceSheetRows: CentralBankBalanceSheetRow[]; liquidityRows: CentralBankLiquidityOperationRow[]; policyRateRows: PolicyRateRow[]; };
