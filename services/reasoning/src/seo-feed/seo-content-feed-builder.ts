import type { MarketEvidenceClass, SeoContentArchitectureSnapshot, SeoContentFeedAssemblyReport, SeoContentFeedItem, SeoContentFeedSnapshot, SeoPageDefinition, TradingAssetCoverage } from '@elceo/types';
import { validateSeoCanonicalMetadata } from '@elceo/schemas';
import { buildSeoCanonicalMetadata } from './seo-metadata-builder';
import { buildSeoSitemapRecord } from './seo-sitemap-builder';
import { buildSeoStructuredDataPayload } from './seo-structured-data-builder';
import { buildSeoInternalLinkEdges } from './seo-internal-link-graph';
export function buildSeoContentFeedItem(page: SeoPageDefinition, architecture: SeoContentArchitectureSnapshot, generatedAt: string): SeoContentFeedItem {
  const metadata = buildSeoCanonicalMetadata(page); const warnings:string[]=[]; const validation=validateSeoCanonicalMetadata(metadata); const status=validation.ok?'ready':'blocked'; if(validation.ok===false) warnings.push(...validation.errors); if(page.targetKeywords.length===0) warnings.push('missing_keywords'); if(page.relatedAssets.length===0&&page.pageKind==='asset_page') warnings.push('missing_related_assets');
  const allEdges=buildSeoInternalLinkEdges(architecture).filter((e)=>e.sourcePageId===page.pageId);
  const relatedEvidenceClasses=(page.relatedEvidenceTypes as MarketEvidenceClass[]);
  return { pageId:page.pageId, slug:page.slug, pageKind:page.pageKind, status, metadata, sitemap: status==='ready'?buildSeoSitemapRecord(page,generatedAt):null, structuredData:buildSeoStructuredDataPayload(page), targetKeywords:page.targetKeywords, relatedAssets:page.relatedAssets as TradingAssetCoverage[], relatedEvidenceClasses, relatedEvidenceTypes:page.relatedEvidenceTypes, internalLinks:allEdges, warnings };
}
export function buildSeoContentFeedSnapshot(architecture: SeoContentArchitectureSnapshot, generatedAt = new Date().toISOString()): SeoContentFeedSnapshot {
  const items=architecture.pages.filter((p)=>p.isLaunchScope).map((p)=>buildSeoContentFeedItem(p,architecture,generatedAt));
  const sitemapRecords=items.filter((i)=>i.sitemap!==null&&i.metadata.indexingDirective==='index_follow').map((i)=>i.sitemap!);
  const internalLinkEdges=buildSeoInternalLinkEdges(architecture).filter((e)=>new Set(architecture.pages.map((p)=>p.pageId)).has(e.targetPageId));
  return { snapshotId:`seo-feed-${generatedAt}`, generatedAt, items, sitemapRecords, internalLinkEdges, warnings: items.flatMap((i)=>i.warnings) };
}
export function buildSeoContentFeedAssemblyReport(snapshot: SeoContentFeedSnapshot): SeoContentFeedAssemblyReport { const blocked=snapshot.items.filter((x)=>x.status==='blocked').length; return { generatedAt:snapshot.generatedAt,itemCount:snapshot.items.length,sitemapCount:snapshot.sitemapRecords.length,internalLinkCount:snapshot.internalLinkEdges.length,blockedCount:blocked,warnings:snapshot.warnings,pass:blocked===0 }; }
