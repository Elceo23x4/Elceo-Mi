import { ensureUtc, type NormalizedMacroEvent } from '@elceo/schemas';
import type { MacroCalendarProvider } from '../interfaces/MacroCalendarProvider';
import { FirecrawlExtractionAdapter } from '../extraction/FirecrawlExtractionAdapter';

export class InvestingCalendarScrapeAdapter implements MacroCalendarProvider {
  readonly providerId = 'investing-firecrawl';

  constructor(private readonly extractor = new FirecrawlExtractionAdapter()) {}

  async getCalendar(_startIso: string, _endIso: string): Promise<NormalizedMacroEvent[]> {
    const page = await this.extractor.extract('https://www.investing.com/economic-calendar/');

    return [
      ensureUtc({
        type: 'macro_event',
        provider: 'investing-firecrawl',
        eventId: 'investing-placeholder',
        indicatorName: page?.extractedText ? 'Investing calendar extracted' : 'Investing calendar placeholder',
        country: 'GLOBAL',
        releaseTimeUtc: new Date().toISOString(),
        impactLevel: 'low'
      })
    ];
  }
}
