import { strict as a } from 'node:assert';
import { validateSeoCanonicalMetadata, validateSeoContentFeedItem, validateSeoContentFeedSnapshot, validateSeoSitemapRecord, validateSeoStructuredDataPayload } from '@elceo/schemas';
import { buildSeoContentFeedSnapshot } from '../seo-feed/index.js';
import { getSeoContentArchitectureSnapshot } from '../seo-content/index.js';
import { CanonicalMarketIntelligenceBoundaryService } from '../runtime/canonical-market-intelligence-boundary.js';
import { MemoryMarketEvidenceRegistrySnapshotRepository, MemorySeoContentArchitectureSnapshotRepository } from '../persistence/registry-snapshot-repository.js';

export function runSeoContentFeedTests(): void {
 const generatedAt='2026-01-01T00:00:00.000Z'; const arch=getSeoContentArchitectureSnapshot(generatedAt); const snap=buildSeoContentFeedSnapshot(arch,generatedAt);
 a.ok(validateSeoContentFeedSnapshot(snap).ok); a.ok(snap.items.every((x)=>validateSeoContentFeedItem(x).ok)); a.ok(snap.items.every((x)=>validateSeoCanonicalMetadata(x.metadata).ok)); a.ok(snap.sitemapRecords.every((x)=>validateSeoSitemapRecord(x).ok)); a.ok(snap.items.every((x)=>validateSeoStructuredDataPayload(x.structuredData).ok));
 a.equal(new Set(snap.items.map((x)=>x.metadata.canonicalPath)).size,snap.items.length); a.equal(new Set(snap.sitemapRecords.map((x)=>x.pageId)).size,snap.sitemapRecords.length);
 a.ok(snap.items.filter((x)=>x.metadata.indexingDirective==='index_follow').every((x)=>x.sitemap!==null)); a.ok(snap.sitemapRecords.every((x)=>x.priority>=0&&x.priority<=1));
 a.ok(snap.items.every((x)=>typeof JSON.parse(x.structuredData.jsonLdJson)==='object')); a.ok(snap.internalLinkEdges.every((e)=>snap.items.some((i)=>i.pageId===e.targetPageId)));
 a.ok(['nfp','cpi','fomc'].every((k)=>snap.items.some((i)=>i.slug.includes(`macro/${k}`))));
 a.ok(['cot-report','real-yields','treasury-auctions'].every((k)=>snap.items.some((i)=>i.slug.includes(k))));
 a.ok(['xau-usd','eur-usd','gbp-usd','usd-jpy','usd-chf','aud-usd','nzd-usd','usd-cad','btc-usd','nasdaq-100','sp500','de30'].every((k)=>snap.items.some((i)=>i.slug.includes(`assets/${k}`))));
 a.ok(snap.items.every((i)=>i.targetKeywords.join(' ').length<300));
 const boundary=new CanonicalMarketIntelligenceBoundaryService(new MemoryMarketEvidenceRegistrySnapshotRepository(),new MemorySeoContentArchitectureSnapshotRepository());
 a.ok(boundary.listSeoContentFeedItemsForAsset('xau_usd',generatedAt).length>0); a.ok(boundary.listSeoContentFeedItemsForEvidenceClass('macro_calendar',generatedAt).length>0); a.ok(boundary.getSeoContentFeedItemBySlug('macro/nfp',generatedAt)?.pageId.length);
}
