<<<<<<< HEAD
import { ensureUtc, type NormalizedNewsArticle } from '@elceo/schemas';
import type { NewsProvider } from '../interfaces/NewsProvider';
import { fetchJson } from '../http';

type MarketauxRow = {
  uuid?: string;
  source?: string;
  url?: string;
  title?: string;
  description?: string;
  published_at?: string;
};

export class MarketauxNewsAdapter implements NewsProvider {
  readonly providerId = 'marketaux';

  constructor(private readonly apiKey: string, private readonly baseUrl = 'https://api.marketaux.com/v1/news/all') {}

  private assertConfigured(): void {
    if (!this.apiKey.trim()) {
      throw new Error('MarketauxNewsAdapter requires MARKETAUX_API_KEY');
    }
  }

  async searchNews(query: string, fromIso: string, toIso: string): Promise<NormalizedNewsArticle[]> {
    this.assertConfigured();

    const payload = await fetchJson<{ data?: MarketauxRow[] }>(
      `${this.baseUrl}?search=${encodeURIComponent(query)}&published_after=${encodeURIComponent(fromIso)}&published_before=${encodeURIComponent(toIso)}&language=en&limit=50&api_token=${encodeURIComponent(this.apiKey)}`
    );

    return (payload.data ?? [])
      .map((item, index) => {
        if (!item.url || !item.title) return null;

        return ensureUtc({
          type: 'news_article',
          provider: 'marketaux',
          articleId: String(item.uuid ?? `marketaux-${index}`),
          sourceName: String(item.source ?? 'marketaux'),
          url: String(item.url),
          headline: String(item.title),
          summary: String(item.description ?? ''),
          publishedAtUtc: String(item.published_at ?? new Date().toISOString()),
          mentionedAssets: [query],
          dedupeKey: `${String(item.title).toLowerCase().trim()}::${String(item.published_at ?? '').slice(0, 13)}`
        });
      })
      .filter((item): item is NormalizedNewsArticle => item !== null);
  }
}
=======
export {};
>>>>>>> origin/main
