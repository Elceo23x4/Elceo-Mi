import type { SeoPageDefinition } from '@elceo/types';

export function getDefaultSeoFeedPolicy(){
  return {
    sitemapPriorityByPageKind: { asset_page:0.9, macro_event_page:0.85, institution_page:0.8, country_macro_page:0.75, evidence_class_page:0.75, trading_education_page:0.7, market_explainer_page:0.7, comparison_page:0.65, glossary_page:0.65, daily_market_note:0.6, weekly_market_note:0.6 },
    changeFreqByFreshness: { evergreen:'monthly', frequently_updated:'weekly', event_driven:'daily', daily:'daily', weekly:'weekly' } as const,
    indexingByStatus: { ready:'index_follow', draft:'noindex_follow', blocked:'noindex_nofollow', deprecated:'noindex_nofollow' } as const,
    isIndexable: (page: SeoPageDefinition)=>page.isLaunchScope
  };
}
