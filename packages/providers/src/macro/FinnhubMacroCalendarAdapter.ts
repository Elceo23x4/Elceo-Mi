<<<<<<< HEAD
import { ensureUtc, type NormalizedMacroEvent } from '@elceo/schemas';
import type { MacroCalendarProvider } from '../interfaces/MacroCalendarProvider';
import { fetchJson } from '../http';

type FinnhubMacroRow = {
  event?: string;
  country?: string;
  time?: string;
  actual?: number | string;
  estimate?: number | string;
  prev?: number | string;
  impact?: string;
  id?: number | string;
};

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function mapImpactLevel(raw: unknown): 'low' | 'medium' | 'high' {
  const normalized = String(raw ?? '').toLowerCase();
  if (normalized.includes('high')) return 'high';
  if (normalized.includes('low')) return 'low';
  return 'medium';
}

export class FinnhubMacroCalendarAdapter implements MacroCalendarProvider {
  readonly providerId = 'finnhub';

  constructor(private readonly apiKey: string, private readonly baseUrl = 'https://finnhub.io/api/v1') {}

  private assertConfigured(): void {
    if (!this.apiKey.trim()) {
      throw new Error('FinnhubMacroCalendarAdapter requires FINNHUB_API_KEY');
    }
  }

  async getCalendar(startIso: string, endIso: string): Promise<NormalizedMacroEvent[]> {
    this.assertConfigured();

    const payload = await fetchJson<{ economicCalendar?: FinnhubMacroRow[] }>(
      `${this.baseUrl}/calendar/economic?from=${encodeURIComponent(startIso)}&to=${encodeURIComponent(endIso)}&token=${encodeURIComponent(this.apiKey)}`
    );

    const events = payload.economicCalendar ?? [];

    return events.map((event, index) => {
      const actual = toNumber(event.actual);
      const forecast = toNumber(event.estimate);
      const previous = toNumber(event.prev);

      return ensureUtc({
        type: 'macro_event',
        provider: 'finnhub',
        eventId: String(event.id ?? `finnhub-${index}`),
        indicatorName: String(event.event ?? 'macro-event'),
        country: String(event.country ?? 'GLOBAL'),
        releaseTimeUtc: String(event.time ?? new Date().toISOString()),
        ...(actual !== undefined ? { actual } : {}),
        ...(forecast !== undefined ? { forecast } : {}),
        ...(previous !== undefined ? { previous } : {}),
        impactLevel: mapImpactLevel(event.impact)
      });
    });
  }
}
=======
export {};
>>>>>>> origin/main
