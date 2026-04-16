<<<<<<< HEAD
import type { NormalizedExtractedDocument } from '@elceo/schemas';

export interface CrawlerProvider {
  readonly providerId: string;
  extract(url: string): Promise<NormalizedExtractedDocument | null>;
}
=======
export {};
>>>>>>> origin/main
