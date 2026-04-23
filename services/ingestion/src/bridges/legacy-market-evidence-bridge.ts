import type { MarketDataProvider } from '@elceo/providers';
import type { CanonicalAssetSymbol, CanonicalEvent, MarketDataAdapter, Timeframe } from '@elceo/types';
import { mapCandleToCanonical, mapQuoteToCanonical, timeframeToProviderResolution, type BridgeDiagnosticsSource, type BridgeDroppedRecordDiagnostic, validateCanonicalBridgeEvent } from './shared';

export class LegacyMarketEvidenceBridge implements MarketDataAdapter, BridgeDiagnosticsSource {
  private droppedRecords: BridgeDroppedRecordDiagnostic[] = [];

  constructor(private readonly provider: MarketDataProvider, private readonly adapterName = 'legacy-market-evidence-bridge') {}

  consumeBridgeDroppedRecords(): BridgeDroppedRecordDiagnostic[] {
    const output = [...this.droppedRecords];
    this.droppedRecords = [];
    return output;
  }

  async getLatestPrice(asset: CanonicalAssetSymbol): Promise<number> {
    const quote = await this.provider.getLatestQuote(asset);
    if (!quote) return Number.NaN;
    return quote.last;
  }

  async getRecentRange(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<{ high: number; low: number; close: number }> {
    const toIso = new Date().toISOString();
    const fromIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const candles = await this.provider.getCandles(asset, timeframeToProviderResolution(timeframe), fromIso, toIso);
    if (candles.length === 0) return { high: Number.NaN, low: Number.NaN, close: Number.NaN };

    const highs = candles.map((item) => item.high);
    const lows = candles.map((item) => item.low);
    const close = candles[candles.length - 1]?.close ?? Number.NaN;

    return {
      high: Math.max(...highs),
      low: Math.min(...lows),
      close
    };
  }

  async getStructuredMarketEvidence(asset: CanonicalAssetSymbol, timeframe: Timeframe): Promise<CanonicalEvent[]> {
    const toIso = new Date().toISOString();
    const fromIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const quote = await this.provider.getLatestQuote(asset);
    const candles = await this.provider.getCandles(asset, timeframeToProviderResolution(timeframe), fromIso, toIso);

    const events: CanonicalEvent[] = [];

    if (quote) {
      try {
        const mappedQuote = mapQuoteToCanonical(quote, asset, timeframe);
        const validatedQuote = validateCanonicalBridgeEvent(mappedQuote, this.adapterName, this.droppedRecords);
        if (validatedQuote) events.push(validatedQuote);
      } catch (error) {
        this.droppedRecords.push({
          reason: 'bridge_failure',
          adapterName: this.adapterName,
          message: error instanceof Error ? error.message : 'bridge mapping failure',
          eventId: null
        });
      }
    }

    for (const candle of candles.slice(-24)) {
      try {
        const mappedCandle = mapCandleToCanonical(candle, asset, timeframe);
        const validatedCandle = validateCanonicalBridgeEvent(mappedCandle, this.adapterName, this.droppedRecords);
        if (validatedCandle) events.push(validatedCandle);
      } catch (error) {
        this.droppedRecords.push({
          reason: 'bridge_failure',
          adapterName: this.adapterName,
          message: error instanceof Error ? error.message : 'bridge mapping failure',
          eventId: null
        });
      }
    }

    return events;
  }
}
