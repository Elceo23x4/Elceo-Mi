import { ensureUtc, type NormalizedExtractedDocument } from '@elceo/schemas';
import type { CrawlerProvider } from '../interfaces/CrawlerProvider';

export class FirecrawlExtractionAdapter implements CrawlerProvider {
  readonly providerId = 'firecrawl';

  async extract(url: string): Promise<NormalizedExtractedDocument | null> {
    return ensureUtc({
      type: 'extracted_document' as const,
      provider: 'firecrawl' as const,
      documentId: `firecrawl-${encodeURIComponent(url).slice(0, 12)}`,
      sourceUrl: url,
      extractedText: 'Firecrawl extraction placeholder content',
      extractedAtUtc: new Date().toISOString(),
      documentClass: 'other' as const
    });
  }
}
