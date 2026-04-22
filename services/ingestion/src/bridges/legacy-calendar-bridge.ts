import type { MacroCalendarProvider } from '@elceo/providers';
import type { CanonicalEvent, MacroCalendarAdapter } from '@elceo/types';
import { mapMacroEventToCanonical, type BridgeDiagnosticsSource, type BridgeDroppedRecordDiagnostic, validateCanonicalBridgeEvent } from './shared';

export class LegacyCalendarBridge implements MacroCalendarAdapter, BridgeDiagnosticsSource {
  private droppedRecords: BridgeDroppedRecordDiagnostic[] = [];

  constructor(private readonly provider: MacroCalendarProvider, private readonly adapterName = 'legacy-calendar-bridge') {}

  consumeBridgeDroppedRecords(): BridgeDroppedRecordDiagnostic[] {
    const output = [...this.droppedRecords];
    this.droppedRecords = [];
    return output;
  }

  private async mapCalendar(startIso: string, endIso: string, status: CanonicalEvent['status'], predicate: (occurredAtMs: number, nowMs: number) => boolean): Promise<CanonicalEvent[]> {
    const rows = await this.provider.getCalendar(startIso, endIso);
    const nowMs = Date.now();
    const mapped: CanonicalEvent[] = [];

    for (const row of rows) {
      const occurredAtMs = Date.parse(row.releaseTimeUtc);
      if (Number.isNaN(occurredAtMs) || !predicate(occurredAtMs, nowMs)) continue;
      try {
        const candidate = mapMacroEventToCanonical(row, status);
        const validated = validateCanonicalBridgeEvent(candidate, this.adapterName, this.droppedRecords);
        if (validated) mapped.push(validated);
      } catch (error) {
        this.droppedRecords.push({
          reason: 'bridge_failure',
          adapterName: this.adapterName,
          message: error instanceof Error ? error.message : 'bridge mapping failure',
          eventId: row.eventId ?? null
        });
      }
    }

    return mapped;
  }

  async getUpcomingEvents(fromIso: string, toIso: string): Promise<CanonicalEvent[]> {
    return this.mapCalendar(fromIso, toIso, 'scheduled', (occurredAtMs, nowMs) => occurredAtMs >= nowMs);
  }

  async getRecentPublishedEvents(fromIso: string, toIso: string): Promise<CanonicalEvent[]> {
    return this.mapCalendar(fromIso, toIso, 'published', (occurredAtMs, nowMs) => occurredAtMs < nowMs);
  }
}
