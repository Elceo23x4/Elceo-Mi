export const MARKET_EVIDENCE_CLASSES = [
  'macro_calendar','economic_indicator','inflation','labor_market','growth_activity','central_bank_policy','central_bank_liquidity','central_bank_balance_sheet','interest_rates','real_yields','bond_auctions','government_debt_supply','cot_positioning','futures_positioning','volatility_surface','credit_stress','cross_market_rates','dollar_liquidity','equity_index_breadth','crypto_market_structure','bank_health','bank_earnings','stress_tests','institutional_liquidity','macro_surprise_history','market_news','geopolitical_risk','energy_commodities','precious_metals_flows','risk_sentiment','earnings_macro','liquidity_conditions','financial_conditions','positioning_sentiment'
] as const;
export type MarketEvidenceClass = (typeof MARKET_EVIDENCE_CLASSES)[number];

export const MARKET_EVIDENCE_SOURCE_KINDS = ['official_government','central_bank','regulator','exchange','public_market_data','news_provider','economic_database','provider_api','calculated_internal','manual_research'] as const;
export type MarketEvidenceSourceKind = (typeof MARKET_EVIDENCE_SOURCE_KINDS)[number];

export const MARKET_EVIDENCE_ACCESS_LEVELS = ['public','free_api','paid_api','licensed','internal_calculated'] as const;
export type MarketEvidenceAccessLevel = (typeof MARKET_EVIDENCE_ACCESS_LEVELS)[number];

export const MARKET_EVIDENCE_FREQUENCIES = ['real_time','intraday','daily','weekly','monthly','quarterly','annual','event_driven'] as const;
export type MarketEvidenceFrequency = (typeof MARKET_EVIDENCE_FREQUENCIES)[number];

export const MARKET_EVIDENCE_REGIONS = ['global','united_states','euro_area','united_kingdom','japan','canada','australia','new_zealand','switzerland','germany','china','emerging_markets'] as const;
export type MarketEvidenceRegion = (typeof MARKET_EVIDENCE_REGIONS)[number];

export const TRADING_ASSET_COVERAGE = ['xau_usd','eur_usd','gbp_usd','usd_jpy','usd_chf','aud_usd','nzd_usd','usd_cad','btc_usd','nasdaq_100','sp500','de30'] as const;
export type TradingAssetCoverage = (typeof TRADING_ASSET_COVERAGE)[number];

export type MarketEvidenceSource = { sourceId: string; sourceName: string; sourceKind: MarketEvidenceSourceKind; institutionName: string; region: MarketEvidenceRegion; countryOrBloc: string; accessLevel: MarketEvidenceAccessLevel; homepageUrl: string; notes: string; };
export type MarketEvidenceTypeDefinition = { evidenceTypeId: string; evidenceClass: MarketEvidenceClass; displayName: string; description: string; frequency: MarketEvidenceFrequency; primarySources: string[]; regions: MarketEvidenceRegion[]; accessLevel: MarketEvidenceAccessLevel; isLaunchScope: boolean; isPublicAccessible: boolean; excludedReason: string | null; };
export type MarketEvidenceAssetInfluence = { asset: TradingAssetCoverage; evidenceTypeId: string; influenceDirection: 'bullish' | 'bearish' | 'two_sided' | 'contextual'; influenceStrength: 'low' | 'medium' | 'high'; influenceHorizon: 'intraday' | 'swing' | 'position' | 'regime'; rationale: string; primaryCountries: string[]; primaryInstitutions: string[]; };
export type MarketEvidenceRegistrySnapshot = { generatedAt: string; evidenceTypes: MarketEvidenceTypeDefinition[]; sources: MarketEvidenceSource[]; assetInfluences: MarketEvidenceAssetInfluence[]; };
