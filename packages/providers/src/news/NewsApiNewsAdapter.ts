<<<<<<< HEAD
import { ensureUtc, type NormalizedNewsArticle } from '@elceo/schemas';
import type { NewsProvider } from '../interfaces/NewsProvider';
import { fetchJson } from '../http';

type NewsApiRow = {
  source?: { name?: string };
  url?: string;
  title?: string;
  description?: string;
  publishedAt?: string;
};

export class NewsApiNewsAdapter implements NewsProvider {
  readonly providerId = 'newsapi';

  constructor(private readonly apiKey: string, private readonly baseUrl = 'https://newsapi.org/v2/everything') {}

  private assertConfigured(): void {
    if (!this.apiKey.trim()) {
      throw new Error('NewsApiNewsAdapter requires NEWSAPI_API_KEY');
    }
  }

  async searchNews(query: string, fromIso: string, toIso: string): Promise<NormalizedNewsArticle[]> {
    this.assertConfigured();

    const payload = await fetchJson<{ articles?: NewsApiRow[] }>(
      `${this.baseUrl}?q=${encodeURIComponent(query)}&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}&sortBy=publishedAt&pageSize=50&language=en&apiKey=${encodeURIComponent(this.apiKey)}`
    );

    return (payload.articles ?? [])
      .map((item, index) => {
        if (!item.url || !item.title) return null;

        return ensureUtc({
          type: 'news_article',
          provider: 'newsapi',
          articleId: `${String(item.url ?? `newsapi-${index}`)}`,
          sourceName: String(item.source?.name ?? 'newsapi'),
          url: String(item.url),
          headline: String(item.title),
          summary: String(item.description ?? ''),
          publishedAtUtc: String(item.publishedAt ?? new Date().toISOString()),
          mentionedAssets: [query],
          dedupeKey: `${String(item.title).toLowerCase().trim()}::${String(item.publishedAt ?? '').slice(0, 13)}`
        });
      })
      .filter((item): item is NormalizedNewsArticle => item !== null);
  }
}
=======
export {};
>>>>>>> origin/main
