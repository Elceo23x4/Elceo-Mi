import { ensureUtc, type NormalizedNewsArticle } from '@elceo/schemas';
import type { NewsProvider } from '../interfaces/NewsProvider';
import { fetchJson } from '../http';

export class MarketauxNewsAdapter implements NewsProvider {
  readonly providerId = 'marketaux';

  constructor(private readonly apiKey: string, private readonly baseUrl = 'https://api.marketaux.com/v1/news/all') {}

  async searchNews(query: string, fromIso: string, toIso: string): Promise<NormalizedNewsArticle[]> {
    const payload = await fetchJson<{ data?: Array<Record<string, unknown>> }>(
      `${this.baseUrl}?symbols=${encodeURIComponent(query)}&published_after=${fromIso}&published_before=${toIso}&api_token=${this.apiKey}`
    );

    return (payload.data ?? []).map((item, index) =>
      ensureUtc({
        type: 'news_article',
        provider: 'marketaux',
        articleId: String(item.uuid ?? `marketaux-${index}`),
        sourceName: String(item.source ?? 'marketaux'),
        url: String(item.url ?? ''),
        headline: String(item.title ?? ''),
        summary: String(item.description ?? ''),
        publishedAtUtc: String(item.published_at ?? new Date().toISOString()),
        mentionedAssets: [query],
        dedupeKey: `${String(item.title ?? '').toLowerCase().trim()}::${String(item.published_at ?? '').slice(0, 13)}`
      })
    );
  }
}
