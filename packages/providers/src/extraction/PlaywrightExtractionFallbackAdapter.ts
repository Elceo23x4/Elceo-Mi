import { ensureUtc, type NormalizedExtractedDocument } from '@elceo/schemas';
import type { CrawlerProvider } from '../interfaces/CrawlerProvider';

export class PlaywrightExtractionFallbackAdapter implements CrawlerProvider {
  readonly providerId = 'playwright';

  async extract(url: string): Promise<NormalizedExtractedDocument | null> {
    return ensureUtc({
      type: 'extracted_document' as const,
      provider: 'playwright' as const,
      documentId: `playwright-${encodeURIComponent(url).slice(0, 12)}`,
      sourceUrl: url,
      extractedText: 'Playwright fallback extraction placeholder content',
      extractedAtUtc: new Date().toISOString(),
      documentClass: 'other' as const
    });
  }
}
