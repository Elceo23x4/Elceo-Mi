import type { MarketEvidenceClass, TradingAssetCoverage } from './market-evidence';

export const SEO_PAGE_KINDS = ['asset_page','macro_event_page','institution_page','country_macro_page','evidence_class_page','trading_education_page','market_explainer_page','comparison_page','glossary_page','daily_market_note','weekly_market_note'] as const;
export type SeoPageKind = (typeof SEO_PAGE_KINDS)[number];

export const SEO_KEYWORD_INTENTS = ['informational','educational','analysis','comparison','commercial','navigational'] as const;
export type SeoKeywordIntent = (typeof SEO_KEYWORD_INTENTS)[number];

export const SEO_CONTENT_FRESHNESS_CLASSES = ['evergreen','frequently_updated','event_driven','daily','weekly'] as const;
export type SeoContentFreshnessClass = (typeof SEO_CONTENT_FRESHNESS_CLASSES)[number];

export const SEO_CONTENT_CLUSTERS = ['forex_trading','gold_trading','macro_trading','central_banks','inflation','labor_market','interest_rates','cot_positioning','liquidity','risk_sentiment','crypto_macro','stock_indices','volatility','trading_psychology','trading_journal','portfolio_risk'] as const;
export type SeoContentCluster = (typeof SEO_CONTENT_CLUSTERS)[number];

export type SeoKeywordDefinition = { keywordId: string; phrase: string; intent: SeoKeywordIntent; cluster: SeoContentCluster; priority: number; difficultyTier: 'low' | 'medium' | 'high'; mappedPageKind: SeoPageKind; relatedAssets: TradingAssetCoverage[]; relatedEvidenceClasses: MarketEvidenceClass[]; };
export type SeoPageDefinition = { pageId: string; slug: string; pageKind: SeoPageKind; titleTemplate: string; metaDescriptionTemplate: string; h1Template: string; canonicalPath: string; freshnessClass: SeoContentFreshnessClass; targetKeywords: string[]; relatedEvidenceTypes: string[]; relatedAssets: TradingAssetCoverage[]; internalLinkTargets: string[]; structuredDataKind: 'article' | 'faq' | 'howto' | 'dataset' | 'webpage'; isLaunchScope: boolean; };
export type SeoInternalLinkRule = { ruleId: string; sourcePageKind: SeoPageKind; targetPageKind: SeoPageKind; anchorTemplate: string; rationale: string; };
export type SeoContentArchitectureSnapshot = { generatedAt: string; keywords: SeoKeywordDefinition[]; pages: SeoPageDefinition[]; internalLinkRules: SeoInternalLinkRule[]; };
