import type { MarketEvidenceClass, TradingAssetCoverage } from './market-evidence';
import type { SeoPageKind } from './seo-content';

export const SEO_STRUCTURED_DATA_KINDS = ['web_page','article','faq_page','breadcrumb_list','dataset','financial_product','glossary_term','organization','none'] as const;
export type SeoStructuredDataKind = (typeof SEO_STRUCTURED_DATA_KINDS)[number];

export const SEO_FEED_ITEM_STATUSES = ['draft','ready','blocked','deprecated'] as const;
export type SeoFeedItemStatus = (typeof SEO_FEED_ITEM_STATUSES)[number];

export const SEO_INDEXING_DIRECTIVES = ['index_follow','noindex_follow','noindex_nofollow'] as const;
export type SeoIndexingDirective = (typeof SEO_INDEXING_DIRECTIVES)[number];

export type SeoCanonicalMetadata = { title: string; description: string; canonicalPath: string; indexingDirective: SeoIndexingDirective; structuredDataKind: SeoStructuredDataKind; openGraphTitle: string; openGraphDescription: string; twitterTitle: string; twitterDescription: string; };
export type SeoSitemapRecord = { pageId: string; canonicalPath: string; lastModified: string; changeFrequency: 'hourly'|'daily'|'weekly'|'monthly'; priority: number; indexingDirective: SeoIndexingDirective; };
export type SeoInternalLinkEdge = { sourcePageId: string; targetPageId: string; anchorText: string; rationale: string; };
export type SeoStructuredDataPayload = { pageId: string; kind: SeoStructuredDataKind; jsonLdJson: string; validationNotes: string[]; };
export type SeoContentFeedItem = { pageId: string; slug: string; pageKind: SeoPageKind; status: SeoFeedItemStatus; metadata: SeoCanonicalMetadata; sitemap: SeoSitemapRecord | null; structuredData: SeoStructuredDataPayload; targetKeywords: string[]; relatedAssets: TradingAssetCoverage[]; relatedEvidenceClasses: MarketEvidenceClass[]; relatedEvidenceTypes: string[]; internalLinks: SeoInternalLinkEdge[]; warnings: string[]; };
export type SeoContentFeedSnapshot = { snapshotId: string; generatedAt: string; items: SeoContentFeedItem[]; sitemapRecords: SeoSitemapRecord[]; internalLinkEdges: SeoInternalLinkEdge[]; warnings: string[]; };
export type SeoContentFeedAssemblyReport = { generatedAt: string; itemCount: number; sitemapCount: number; internalLinkCount: number; blockedCount: number; warnings: string[]; pass: boolean; };
