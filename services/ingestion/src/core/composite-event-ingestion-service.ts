import type { CanonicalAssetSymbol, CanonicalEvent, CanonicalProviderAdapterSuite, Timeframe } from '@elceo/types';
import { buildCanonicalEventDedupeKey, mergeDuplicateCanonicalEvents } from './event-dedupe';
import type { CompositeIngestionDiagnostics } from './event-diagnostics';
import { tryEnrichCanonicalEvent } from './event-enrichment';

export type CollectForAssetWindowParams = {
  asset: CanonicalAssetSymbol;
  timeframe: Timeframe;
  asOf: string;
  fromIso: string;
  toIso: string;
};

export class CompositeEventIngestionService {
  constructor(private readonly adapters: Partial<CanonicalProviderAdapterSuite>) {}

  async collectForAssetWindow(params: CollectForAssetWindowParams): Promise<{ events: CanonicalEvent[]; diagnostics: CompositeIngestionDiagnostics }> {
    const diagnostics: CompositeIngestionDiagnostics = {
      adapterFailures: [],
      invalidEvents: [],
      merges: [],
      droppedEvents: [],
      totalFetched: 0,
      totalValidated: 0,
      totalMergedGroups: 0,
      totalOutput: 0
    };

    const fetched: Array<{ adapterName: string; event: CanonicalEvent }> = [];

    const calls: Array<{ adapterName: string; run: () => Promise<CanonicalEvent[] | null> }> = [
      {
        adapterName: 'marketData.getStructuredMarketEvidence',
        run: async () => this.adapters.marketData?.getStructuredMarketEvidence(params.asset, params.timeframe) ?? null
      },
      {
        adapterName: 'macroCalendar.getUpcomingEvents',
        run: async () => this.adapters.macroCalendar?.getUpcomingEvents(params.fromIso, params.toIso) ?? null
      },
      {
        adapterName: 'macroCalendar.getRecentPublishedEvents',
        run: async () => this.adapters.macroCalendar?.getRecentPublishedEvents(params.fromIso, params.toIso) ?? null
      },
      {
        adapterName: 'news.getRecentNewsEvidence',
        run: async () => this.adapters.news?.getRecentNewsEvidence(params.asset, params.fromIso, params.toIso) ?? null
      },
      {
        adapterName: 'geopolitics.getRecentGeopoliticalEvidence',
        run: async () => this.adapters.geopolitics?.getRecentGeopoliticalEvidence(params.asset, params.fromIso, params.toIso) ?? null
      },
      {
        adapterName: 'macroContext.getMacroContext',
        run: async () => this.adapters.macroContext?.getMacroContext(params.asset, params.asOf) ?? null
      }
    ];

    for (const call of calls) {
      try {
        const items = await call.run();
        if (!items) continue;
        diagnostics.totalFetched += items.length;
        for (const event of items) {
          fetched.push({ adapterName: call.adapterName, event });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown adapter failure';
        diagnostics.adapterFailures.push({ adapterName: call.adapterName, stage: 'fetch', message, occurredAt: new Date().toISOString() });
        diagnostics.droppedEvents.push({ reason: 'adapter_failure', eventId: null, adapterName: call.adapterName, message });
      }
    }

    const enriched: CanonicalEvent[] = [];

    for (const item of fetched) {
      const result = tryEnrichCanonicalEvent(item.event, params.asset, params.timeframe, params.asOf);
      if ('value' in result) {
        diagnostics.totalValidated += 1;
        enriched.push({ ...result.value, dedupeKey: buildCanonicalEventDedupeKey(result.value) });
        continue;
      }

      diagnostics.invalidEvents.push({
        adapterName: item.adapterName,
        stage: 'validate',
        eventId: result.eventId,
        message: result.message,
        fieldPath: result.fieldPath,
        occurredAt: new Date().toISOString()
      });
      diagnostics.droppedEvents.push({ reason: 'invalid', eventId: result.eventId, adapterName: item.adapterName, message: result.message });
    }

    const { mergedEvents, merges, droppedSecondaryIds } = mergeDuplicateCanonicalEvents(enriched, params.asset, params.timeframe, params.asOf);

    diagnostics.merges.push(...merges);
    diagnostics.totalMergedGroups = merges.length;

    for (const droppedId of droppedSecondaryIds) {
      diagnostics.droppedEvents.push({ reason: 'duplicate_secondary', eventId: droppedId, adapterName: null, message: 'Merged into primary duplicate event' });
    }

    const sorted = [...mergedEvents].sort((left, right) => {
      if (right.relevanceScore !== left.relevanceScore) return right.relevanceScore - left.relevanceScore;

      const impactWeight: Record<CanonicalEvent['impact'], number> = { critical: 4, high: 3, medium: 2, low: 1 };
      if (impactWeight[right.impact] !== impactWeight[left.impact]) return impactWeight[right.impact] - impactWeight[left.impact];

      if (right.recencyScore !== left.recencyScore) return right.recencyScore - left.recencyScore;

      const detectedAtDiff = new Date(right.detectedAt).getTime() - new Date(left.detectedAt).getTime();
      if (detectedAtDiff !== 0) return detectedAtDiff;

      return left.id.localeCompare(right.id);
    });

    diagnostics.totalOutput = sorted.length;

    return { events: sorted, diagnostics };
  }
}
