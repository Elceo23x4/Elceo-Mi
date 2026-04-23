import type { NewsProvider } from '@elceo/providers';
import type { CanonicalAssetSymbol, CanonicalEvent, NewsAdapter } from '@elceo/types';
import { mapNewsArticleToCanonical, type BridgeDiagnosticsSource, type BridgeDroppedRecordDiagnostic, validateCanonicalBridgeEvent } from './shared';

export class LegacyNewsBridge implements NewsAdapter, BridgeDiagnosticsSource {
  private droppedRecords: BridgeDroppedRecordDiagnostic[] = [];

  constructor(private readonly provider: NewsProvider, private readonly adapterName = 'legacy-news-bridge') {}

  consumeBridgeDroppedRecords(): BridgeDroppedRecordDiagnostic[] {
    const output = [...this.droppedRecords];
    this.droppedRecords = [];
    return output;
  }

  async getRecentNewsEvidence(asset: CanonicalAssetSymbol, fromIso: string, toIso: string): Promise<CanonicalEvent[]> {
    const rows = await this.provider.searchNews(asset, fromIso, toIso);
    const output: CanonicalEvent[] = [];

    for (const row of rows) {
      try {
        const candidate = mapNewsArticleToCanonical(row, asset);
        const validated = validateCanonicalBridgeEvent(candidate, this.adapterName, this.droppedRecords);
        if (validated) output.push(validated);
      } catch (error) {
        this.droppedRecords.push({
          reason: 'bridge_failure',
          adapterName: this.adapterName,
          message: error instanceof Error ? error.message : 'bridge mapping failure',
          eventId: row.articleId ?? null
        });
      }
    }

    return output;
  }
}
