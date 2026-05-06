import type { SeoCanonicalMetadata, SeoPageDefinition, SeoStructuredDataKind } from '@elceo/types';
const mapKind=(k:SeoPageDefinition['structuredDataKind']):SeoStructuredDataKind=>k==='webpage'?'web_page':k==='faq'?'faq_page':k==='dataset'?'dataset':'article';
export function buildSeoCanonicalMetadata(page: SeoPageDefinition): SeoCanonicalMetadata {
  const title=page.titleTemplate.trim(); const description=page.metaDescriptionTemplate.trim();
  return { title, description, canonicalPath: page.canonicalPath, indexingDirective: page.isLaunchScope?'index_follow':'noindex_follow', structuredDataKind: mapKind(page.structuredDataKind), openGraphTitle:title, openGraphDescription:description, twitterTitle:title, twitterDescription:description };
}
