import type { SeoPageDefinition, SeoSitemapRecord } from '@elceo/types';
import { getDefaultSeoFeedPolicy } from './seo-feed-policy';
export function buildSeoSitemapRecord(page: SeoPageDefinition, generatedAt: string): SeoSitemapRecord {
  const policy=getDefaultSeoFeedPolicy();
  return { pageId: page.pageId, canonicalPath: page.canonicalPath, lastModified: generatedAt, changeFrequency: policy.changeFreqByFreshness[page.freshnessClass], priority: policy.sitemapPriorityByPageKind[page.pageKind], indexingDirective: page.isLaunchScope?'index_follow':'noindex_follow' };
}
