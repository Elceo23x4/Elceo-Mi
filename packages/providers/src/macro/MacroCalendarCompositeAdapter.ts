import { providerPriority } from '@elceo/config';
import type { NormalizedMacroEvent } from '@elceo/schemas';
import type { MacroCalendarProvider } from '../interfaces/MacroCalendarProvider';

export class MacroCalendarCompositeAdapter implements MacroCalendarProvider {
  readonly providerId = 'macro-composite';

  constructor(private readonly providers: Record<string, MacroCalendarProvider>) {}

  async getCalendar(startIso: string, endIso: string): Promise<NormalizedMacroEvent[]> {
    for (const providerKey of providerPriority.macroCalendar) {
      const provider = this.providers[providerKey];
      if (!provider) continue;
      try {
        const events = await provider.getCalendar(startIso, endIso);
        if (events.length > 0) return events;
      } catch {
        continue;
      }
    }
    return [];
  }
}
