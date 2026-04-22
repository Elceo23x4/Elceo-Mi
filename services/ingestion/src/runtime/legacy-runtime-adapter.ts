import type { CanonicalAssetSymbol, CanonicalEvent, Timeframe } from '@elceo/types';
import { buildProviderGraph } from '../adapters/build-provider-graph';
import {
  mapCandleToCanonical,
  mapGeopoliticalEventToCanonical,
  mapMacroContextRecordToCanonical,
  mapMacroEventToCanonical,
  mapNewsArticleToCanonical,
  mapQuoteToCanonical,
  validateCanonicalBridgeEvent
} from '../bridges/shared';

export type LegacyRuntimeAdapterResult = {
  events: CanonicalEvent[];
  failures: Array<{ stage: string; message: string }>;
};

export class LegacyRuntimeAdapter {
  async collectAssetWindow(params: {
    asset: CanonicalAssetSymbol;
    timeframe: Timeframe;
    fromIso: string;
    toIso: string;
    asOf: string;
  }): Promise<LegacyRuntimeAdapterResult> {
    const providers = buildProviderGraph();
    const events: CanonicalEvent[] = [];
    const failures: Array<{ stage: string; message: string }> = [];
    const dropped: Array<{ reason: 'invalid'; adapterName: string; message: string; eventId: string | null }> = [];

    try {
      const quote = await providers.marketComposite.getLatestQuote(params.asset);
      if (quote) {
        const mapped = mapQuoteToCanonical(quote, params.asset, params.timeframe);
        const validated = validateCanonicalBridgeEvent(mapped, 'legacy-runtime-market-quote', dropped);
        if (validated) events.push(validated);
      }

      const candles = await providers.marketComposite.getCandles(params.asset, '240', params.fromIso, params.toIso);
      for (const candle of candles.slice(-24)) {
        const mapped = mapCandleToCanonical(candle, params.asset, params.timeframe);
        const validated = validateCanonicalBridgeEvent(mapped, 'legacy-runtime-market-candle', dropped);
        if (validated) events.push(validated);
      }
    } catch (error) {
      failures.push({ stage: 'market', message: error instanceof Error ? error.message : 'legacy market runtime failure' });
    }

    try {
      const macroEvents = await providers.macroComposite.getCalendar(params.fromIso, params.toIso);
      for (const event of macroEvents) {
        const status: CanonicalEvent['status'] = Date.parse(event.releaseTimeUtc) > Date.parse(params.asOf) ? 'scheduled' : 'published';
        const mapped = mapMacroEventToCanonical(event, status);
        const validated = validateCanonicalBridgeEvent(mapped, 'legacy-runtime-macro', dropped);
        if (validated) events.push(validated);
      }
    } catch (error) {
      failures.push({ stage: 'macro', message: error instanceof Error ? error.message : 'legacy macro runtime failure' });
    }

    try {
      const articles = await providers.newsComposite.searchNews(params.asset, params.fromIso, params.toIso);
      for (const article of articles) {
        const mapped = mapNewsArticleToCanonical(article, params.asset);
        const validated = validateCanonicalBridgeEvent(mapped, 'legacy-runtime-news', dropped);
        if (validated) events.push(validated);
      }
    } catch (error) {
      failures.push({ stage: 'news', message: error instanceof Error ? error.message : 'legacy news runtime failure' });
    }

    try {
      const geopolitical = await providers.geopolitics.searchEvents(params.asset, params.fromIso, params.toIso);
      for (const event of geopolitical) {
        const mapped = mapGeopoliticalEventToCanonical(event, params.asset);
        const validated = validateCanonicalBridgeEvent(mapped, 'legacy-runtime-geopolitics', dropped);
        if (validated) events.push(validated);
      }
    } catch (error) {
      failures.push({ stage: 'geopolitics', message: error instanceof Error ? error.message : 'legacy geopolitics runtime failure' });
    }

    try {
      const countryCode = params.asset === 'DE30' ? 'DE' : 'US';
      const contextRows = await providers.macroContextComposite.getContext(countryCode);
      for (const row of contextRows) {
        const mapped = mapMacroContextRecordToCanonical(row, params.asset, params.asOf);
        const validated = validateCanonicalBridgeEvent(mapped, 'legacy-runtime-macro-context', dropped);
        if (validated) events.push(validated);
      }
    } catch (error) {
      failures.push({ stage: 'macro_context', message: error instanceof Error ? error.message : 'legacy macro context runtime failure' });
    }

    for (const item of dropped) {
      failures.push({ stage: item.adapterName, message: item.message });
    }

    return { events, failures };
  }
}
