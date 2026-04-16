import { ensureUtc, type NormalizedExtractedDocument } from '@elceo/schemas';
import type { CrawlerProvider } from '../interfaces/CrawlerProvider';
import { fetchJson } from '../http';

export class FirecrawlExtractionAdapter implements CrawlerProvider {
  readonly providerId = 'firecrawl';

  constructor(private readonly apiKey?: string, private readonly baseUrl = 'https://api.firecrawl.dev/v1') {}

  async extract(url: string): Promise<NormalizedExtractedDocument | null> {
    if (!this.apiKey) {
      return ensureUtc({
        type: 'extracted_document' as const,
        provider: 'firecrawl' as const,
        documentId: `firecrawl-${encodeURIComponent(url).slice(0, 12)}`,
        sourceUrl: url,
        extractedText: 'Firecrawl API key missing; extraction fallback content.',
        extractedAtUtc: new Date().toISOString(),
        documentClass: 'other' as const
      });
    }

    try {
      const payload = await fetchJson<{ data?: { markdown?: string } }>(`${this.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ url, formats: ['markdown'] })
      });

      return ensureUtc({
        type: 'extracted_document' as const,
        provider: 'firecrawl' as const,
        documentId: `firecrawl-${encodeURIComponent(url).slice(0, 12)}`,
        sourceUrl: url,
        extractedText: payload.data?.markdown ?? '',
        extractedAtUtc: new Date().toISOString(),
        documentClass: 'other' as const
      });
    } catch {
      return null;
    }
  }
}
