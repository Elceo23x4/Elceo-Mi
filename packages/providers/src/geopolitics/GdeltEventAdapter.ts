import { ensureUtc, type NormalizedGeopoliticalEvent } from '@elceo/schemas';
import type { GeopoliticsProvider } from '../interfaces/GeopoliticsProvider';

export class GdeltEventAdapter implements GeopoliticsProvider {
  readonly providerId = 'gdelt';

  async searchEvents(query: string, _fromIso: string, _toIso: string): Promise<NormalizedGeopoliticalEvent[]> {
    return [
      ensureUtc({
        type: 'geopolitical_event',
        provider: 'gdelt',
        eventId: `gdelt-${query.toLowerCase()}`,
        title: `GDELT cluster for ${query}`,
        summary: 'Geopolitical event clustering scaffold output.',
        regionTags: ['global'],
        occurredAtUtc: new Date().toISOString(),
        dedupeKey: `${query.toLowerCase()}::${new Date().toISOString().slice(0, 13)}`
      })
    ];
  }
}
