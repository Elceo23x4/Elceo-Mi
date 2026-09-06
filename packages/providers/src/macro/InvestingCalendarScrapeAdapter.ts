import { type NormalizedMacroEvent } from '@elceo/schemas';
import type { MacroCalendarProvider } from '../interfaces/MacroCalendarProvider';
import { FirecrawlExtractionAdapter } from '../extraction/FirecrawlExtractionAdapter';

export class InvestingCalendarScrapeAdapter implements MacroCalendarProvider {
  readonly providerId = 'investing-firecrawl';

  constructor(private readonly extractor = new FirecrawlExtractionAdapter()) {}

  async getCalendar(_startIso: string, _endIso: string): Promise<NormalizedMacroEvent[]> {
    // Extraction is not evidence until a permitted, validated calendar parser exists.
    return [];
  }
}
