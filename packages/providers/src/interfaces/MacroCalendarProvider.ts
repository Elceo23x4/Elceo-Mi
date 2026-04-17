import type { NormalizedMacroEvent } from '@elceo/schemas';

export interface MacroCalendarProvider {
  readonly providerId: string;
  getCalendar(startIso: string, endIso: string): Promise<NormalizedMacroEvent[]>;
}
