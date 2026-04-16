import type { NormalizedNewsArticle } from '@elceo/schemas';

export interface NewsProvider {
  readonly providerId: string;
  searchNews(query: string, fromIso: string, toIso: string): Promise<NormalizedNewsArticle[]>;
}
