import { ensureUtc, type NormalizedNewsArticle } from '@elceo/schemas';
import type { NewsProvider } from '../interfaces/NewsProvider';
import { fetchJson } from '../http';

export class NewsApiNewsAdapter implements NewsProvider {
  readonly providerId = 'newsapi';

  constructor(private readonly apiKey: string, private readonly baseUrl = 'https://newsapi.org/v2/everything') {}

  async searchNews(query: string, fromIso: string, toIso: string): Promise<NormalizedNewsArticle[]> {
    const payload = await fetchJson<{ articles?: Array<Record<string, unknown>> }>(
      `${this.baseUrl}?q=${encodeURIComponent(query)}&from=${fromIso}&to=${toIso}&sortBy=publishedAt&apiKey=${this.apiKey}`
    );

    return (payload.articles ?? []).map((item, index) =>
      ensureUtc({
        type: 'news_article',
        provider: 'newsapi',
        articleId: `${String(item.url ?? `newsapi-${index}`)}`,
        sourceName: String((item.source as { name?: string } | undefined)?.name ?? 'newsapi'),
        url: String(item.url ?? ''),
        headline: String(item.title ?? ''),
        summary: String(item.description ?? ''),
        publishedAtUtc: String(item.publishedAt ?? new Date().toISOString()),
        mentionedAssets: [query],
        dedupeKey: `${String(item.title ?? '').toLowerCase().trim()}::${String(item.publishedAt ?? '').slice(0, 13)}`
      })
    );
  }
}
