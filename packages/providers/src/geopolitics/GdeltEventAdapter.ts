import { ensureUtc, type NormalizedGeopoliticalEvent } from '@elceo/schemas';
import type { GeopoliticsProvider } from '../interfaces/GeopoliticsProvider';
import { fetchJson } from '../http';

export class GdeltEventAdapter implements GeopoliticsProvider {
  readonly providerId = 'gdelt';

  async searchEvents(query: string, _fromIso: string, _toIso: string): Promise<NormalizedGeopoliticalEvent[]> {
    try {
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&format=json&maxrecords=20`;
      const payload = await fetchJson<{ articles?: Array<{ url?: string; title?: string; seendate?: string }> }>(url);

      return (payload.articles ?? []).map((article, index) =>
        ensureUtc({
          type: 'geopolitical_event',
          provider: 'gdelt',
          eventId: article.url ?? `gdelt-${index}`,
          title: article.title ?? 'GDELT event',
          summary: article.title ?? 'GDELT event summary unavailable',
          regionTags: ['global'],
          occurredAtUtc: article.seendate ?? new Date().toISOString(),
          dedupeKey: `${(article.title ?? '').toLowerCase()}::${(article.seendate ?? '').slice(0, 13)}`
        })
      );
    } catch {
      return [
        ensureUtc({
          type: 'geopolitical_event',
          provider: 'gdelt',
          eventId: `gdelt-${query.toLowerCase()}`,
          title: `GDELT cluster for ${query}`,
          summary: 'Fallback geopolitical event clustering output.',
          regionTags: ['global'],
          occurredAtUtc: new Date().toISOString(),
          dedupeKey: `${query.toLowerCase()}::${new Date().toISOString().slice(0, 13)}`
        })
      ];
    }
  }
}
