import { ensureUtc, type NormalizedMacroEvent } from '@elceo/schemas';
import type { MacroCalendarProvider } from '../interfaces/MacroCalendarProvider';

export class InvestingCalendarScrapeAdapter implements MacroCalendarProvider {
  readonly providerId = 'investing-firecrawl';

  async getCalendar(_startIso: string, _endIso: string): Promise<NormalizedMacroEvent[]> {
    return [
      ensureUtc({
        type: 'macro_event',
        provider: 'investing-firecrawl',
        eventId: 'investing-placeholder',
        indicatorName: 'Investing.com calendar placeholder',
        country: 'GLOBAL',
        releaseTimeUtc: new Date().toISOString(),
        impactLevel: 'low'
      })
    ];
  }
}
