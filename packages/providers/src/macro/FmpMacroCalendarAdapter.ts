<<<<<<< HEAD
import { ensureUtc, type NormalizedMacroEvent } from '@elceo/schemas';
import type { MacroCalendarProvider } from '../interfaces/MacroCalendarProvider';
import { fetchJson } from '../http';

export class FmpMacroCalendarAdapter implements MacroCalendarProvider {
  readonly providerId = 'fmp';

  constructor(private readonly apiKey: string, private readonly baseUrl = 'https://financialmodelingprep.com/api/v3') {}

  async getCalendar(_startIso: string, _endIso: string): Promise<NormalizedMacroEvent[]> {
    const payload = await fetchJson<Array<{ date: string; event: string; country: string }>>(
      `${this.baseUrl}/economic_calendar?apikey=${this.apiKey}`
    );

    return payload.slice(0, 50).map((event, index) =>
      ensureUtc({
        type: 'macro_event',
        provider: 'fmp',
        eventId: `fmp-${index}-${event.event}`,
        indicatorName: event.event,
        country: event.country,
        releaseTimeUtc: event.date,
        impactLevel: 'medium'
      })
    );
  }
}
=======
export {};
>>>>>>> origin/main
