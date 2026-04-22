import type { GeopoliticsProvider } from '@elceo/providers';
import type { CanonicalAssetSymbol, CanonicalEvent, GeopoliticalEventAdapter } from '@elceo/types';
import { mapGeopoliticalEventToCanonical, type BridgeDiagnosticsSource, type BridgeDroppedRecordDiagnostic, validateCanonicalBridgeEvent } from './shared';

export class LegacyGeopoliticsBridge implements GeopoliticalEventAdapter, BridgeDiagnosticsSource {
  private droppedRecords: BridgeDroppedRecordDiagnostic[] = [];

  constructor(private readonly provider: GeopoliticsProvider, private readonly adapterName = 'legacy-geopolitics-bridge') {}

  consumeBridgeDroppedRecords(): BridgeDroppedRecordDiagnostic[] {
    const output = [...this.droppedRecords];
    this.droppedRecords = [];
    return output;
  }

  async getRecentGeopoliticalEvidence(asset: CanonicalAssetSymbol, fromIso: string, toIso: string): Promise<CanonicalEvent[]> {
    const rows = await this.provider.searchEvents(asset, fromIso, toIso);
    const output: CanonicalEvent[] = [];

    for (const row of rows) {
      try {
        const candidate = mapGeopoliticalEventToCanonical(row, asset);
        const validated = validateCanonicalBridgeEvent(candidate, this.adapterName, this.droppedRecords);
        if (validated) output.push(validated);
      } catch (error) {
        this.droppedRecords.push({
          reason: 'bridge_failure',
          adapterName: this.adapterName,
          message: error instanceof Error ? error.message : 'bridge mapping failure',
          eventId: row.eventId ?? null
        });
      }
    }

    return output;
  }
}
