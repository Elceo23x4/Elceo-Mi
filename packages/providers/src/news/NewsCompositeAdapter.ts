<<<<<<< HEAD
import { providerPriority } from '@elceo/config';
import type { NormalizedNewsArticle } from '@elceo/schemas';
import type { NewsProvider } from '../interfaces/NewsProvider';

export class NewsCompositeAdapter implements NewsProvider {
  readonly providerId = 'news-composite';

  constructor(private readonly providers: Record<string, NewsProvider>) {}

  async searchNews(query: string, fromIso: string, toIso: string): Promise<NormalizedNewsArticle[]> {
    const merged: NormalizedNewsArticle[] = [];

    for (const providerKey of providerPriority.news) {
      const provider = this.providers[providerKey];
      if (!provider) continue;

      try {
        const articles = await provider.searchNews(query, fromIso, toIso);
        merged.push(...articles);
      } catch {
        continue;
      }
    }

    const unique = new Map<string, NormalizedNewsArticle>();
    for (const article of merged) {
      if (!unique.has(article.dedupeKey)) unique.set(article.dedupeKey, article);
    }

    return Array.from(unique.values());
  }
}
=======
export {};
>>>>>>> origin/main
