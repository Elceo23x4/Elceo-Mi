import type { MarketCognitionSignalKind, MarketEvidenceClass } from '@elceo/types';
export const SIGNAL_CLASS_MAP: Record<Exclude<MarketCognitionSignalKind,'freshness_warning'|'contradiction_flag'|'confidence_decomposition'|'narrative_summary'>, MarketEvidenceClass[]> = {
  macro_pressure: ['inflation','labor_market','growth_activity','economic_indicator','macro_calendar','macro_surprise_history'],
  liquidity_pressure: ['dollar_liquidity','liquidity_conditions','central_bank_liquidity','central_bank_balance_sheet','financial_conditions'],
  risk_sentiment_pressure: ['risk_sentiment','equity_index_breadth','volatility_surface','cross_market_rates'],
  positioning_tension: ['cot_positioning','futures_positioning','positioning_sentiment','crypto_market_structure'],
  volatility_pressure: ['volatility_surface'],
  credit_stress_pressure: ['credit_stress','bank_health','stress_tests','institutional_liquidity'],
  policy_pressure: ['central_bank_policy','interest_rates','real_yields','bond_auctions','government_debt_supply'],
  earnings_pressure: ['earnings_macro','bank_earnings'],
  geopolitical_pressure: ['geopolitical_risk','energy_commodities','precious_metals_flows']
};
