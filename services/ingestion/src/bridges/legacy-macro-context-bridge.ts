import type { MacroContextProvider } from '@elceo/providers';
import type { CanonicalAssetSymbol, CanonicalEvent, MacroContextAdapter } from '@elceo/types';
import { mapMacroContextRecordToCanonical, type BridgeDiagnosticsSource, type BridgeDroppedRecordDiagnostic, validateCanonicalBridgeEvent } from './shared';

function assetToCountryCode(asset: CanonicalAssetSymbol): string {
  const mapping: Record<string, string> = {
    'XAU/USD': 'US',
    'BTC/USD': 'US',
    'Nasdaq 100': 'US',
    'S&P 500': 'US',
    DE30: 'DE',
    'EUR/USD': 'EZ',
    'GBP/USD': 'UK',
    'USD/JPY': 'JP',
    'USD/CHF': 'CH',
    'AUD/USD': 'AU',
    'NZD/USD': 'NZ',
    'USD/CAD': 'CA'
  };

  return mapping[asset] ?? 'US';
}

export class LegacyMacroContextBridge implements MacroContextAdapter, BridgeDiagnosticsSource {
  private droppedRecords: BridgeDroppedRecordDiagnostic[] = [];

  constructor(private readonly provider: MacroContextProvider, private readonly adapterName = 'legacy-macro-context-bridge') {}

  consumeBridgeDroppedRecords(): BridgeDroppedRecordDiagnostic[] {
    const output = [...this.droppedRecords];
    this.droppedRecords = [];
    return output;
  }

  async getMacroContext(asset: CanonicalAssetSymbol, asOfIso: string): Promise<CanonicalEvent[]> {
    const countryCode = assetToCountryCode(asset);
    const rows = await this.provider.getContext(countryCode);
    const output: CanonicalEvent[] = [];

    for (const row of rows) {
      try {
        const candidate = mapMacroContextRecordToCanonical(row, asset, asOfIso);
        const validated = validateCanonicalBridgeEvent(candidate, this.adapterName, this.droppedRecords);
        if (validated) output.push(validated);
      } catch (error) {
        this.droppedRecords.push({
          reason: 'bridge_failure',
          adapterName: this.adapterName,
          message: error instanceof Error ? error.message : 'bridge mapping failure',
          eventId: `${row.providerId}-${row.metric}`
        });
      }
    }

    return output;
  }
}
