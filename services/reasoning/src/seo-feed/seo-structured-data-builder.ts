import type { SeoPageDefinition, SeoStructuredDataPayload } from '@elceo/types';
import { buildSeoCanonicalMetadata } from './seo-metadata-builder';
export function buildSeoStructuredDataPayload(page: SeoPageDefinition): SeoStructuredDataPayload {
  const meta=buildSeoCanonicalMetadata(page);
  return { pageId: page.pageId, kind: meta.structuredDataKind, jsonLdJson: JSON.stringify({ '@context':'https://schema.org', '@type': meta.structuredDataKind, name: meta.title, description: meta.description, url: meta.canonicalPath }), validationNotes: [] };
}
