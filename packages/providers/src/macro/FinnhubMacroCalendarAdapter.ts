import { ensureUtc, type NormalizedMacroEvent } from '@elceo/schemas';
import type { MacroCalendarProvider } from '../interfaces/MacroCalendarProvider';
import { fetchJson } from '../http';

export class FinnhubMacroCalendarAdapter implements MacroCalendarProvider {
  readonly providerId = 'finnhub';

  constructor(private readonly apiKey: string, private readonly baseUrl = 'https://finnhub.io/api/v1') {}

  async getCalendar(startIso: string, endIso: string): Promise<NormalizedMacroEvent[]> {
    const payload = await fetchJson<{ economicCalendar?: Array<Record<string, unknown>> }>(
      `${this.baseUrl}/calendar/economic?from=${startIso}&to=${endIso}&token=${this.apiKey}`
    );
    const events = payload.economicCalendar ?? [];

    return events.map((event, index) =>
      ensureUtc({
        type: 'macro_event',
        provider: 'finnhub',
        eventId: String(event.id ?? `finnhub-${index}`),
        indicatorName: String(event.event ?? 'macro-event'),
        country: String(event.country ?? 'GLOBAL'),
        releaseTimeUtc: String(event.time ?? new Date().toISOString()),
        actual: Number(event.actual ?? NaN),
        forecast: Number(event.estimate ?? NaN),
        previous: Number(event.prev ?? NaN),
        impactLevel: 'medium'
      })
    );
  }
}
