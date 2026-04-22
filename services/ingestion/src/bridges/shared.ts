import { validateCanonicalEvent, type NormalizedCandle, type NormalizedGeopoliticalEvent, type NormalizedMacroEvent, type NormalizedMarketQuote, type NormalizedNewsArticle } from '@elceo/schemas';
import type { CanonicalAssetSymbol, CanonicalEvent, EvidenceKind, Timeframe } from '@elceo/types';
import { mapInternalNormalizedEventToCanonicalEvent } from '@elceo/types';
import { normalizeEvent } from '../normalization/normalizeEvent';

export type BridgeDroppedRecordDiagnostic = {
  reason: 'bridge_failure' | 'invalid';
  adapterName: string;
  message: string;
  eventId: string | null;
};

export interface BridgeDiagnosticsSource {
  consumeBridgeDroppedRecords(): BridgeDroppedRecordDiagnostic[];
}

export function mapCountryToCurrency(country: string): string | null {
  const normalized = country.toUpperCase();
  const map: Record<string, string> = {
    US: 'USD',
    EZ: 'EUR',
    EU: 'EUR',
    UK: 'GBP',
    JP: 'JPY',
    CH: 'CHF',
    CA: 'CAD',
    AU: 'AUD',
    NZ: 'NZD',
    DE: 'EUR',
    CN: 'CNY'
  };
  return map[normalized] ?? null;
}

export function mapCurrencyToAssets(currency: string | null): CanonicalAssetSymbol[] {
  if (!currency) return [];
  const normalized = currency.toUpperCase();
  const mapping: Record<string, CanonicalAssetSymbol[]> = {
    USD: ['XAU/USD', 'BTC/USD', 'S&P 500', 'Nasdaq 100', 'EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'NZD/USD', 'USD/CAD'],
    EUR: ['EUR/USD', 'DE30'],
    GBP: ['GBP/USD'],
    JPY: ['USD/JPY'],
    CHF: ['USD/CHF'],
    CAD: ['USD/CAD'],
    AUD: ['AUD/USD'],
    NZD: ['NZD/USD'],
    XAU: ['XAU/USD'],
    BTC: ['BTC/USD']
  };
  return mapping[normalized] ?? [];
}

export function timeframeToProviderResolution(timeframe: Timeframe): string {
  const map: Record<Timeframe, string> = {
    M5: '5',
    M15: '15',
    H1: '60',
    H4: '240',
    D1: 'D'
  };
  return map[timeframe];
}

function mapImpact(value: 'low' | 'medium' | 'high' | undefined): CanonicalEvent['impact'] {
  if (value === 'low') return 'low';
  if (value === 'medium') return 'medium';
  if (value === 'high') return 'high';
  return 'medium';
}

type BridgeMappingInput = {
  legacyEvent: ReturnType<typeof normalizeEvent>;
  sourceCategory: CanonicalEvent['sourceCategory'];
  eventKind: EvidenceKind;
  title: string;
  summary: string;
  normalizedNarrative: string;
  detectedAt: string;
  relatedAssets: CanonicalAssetSymbol[];
  relatedTimeframes: Timeframe[];
  relevanceScore?: number;
  sourceReliabilityScore?: number;
  recencyScore?: number;
  impact?: CanonicalEvent['impact'];
  status?: CanonicalEvent['status'];
  region?: string | null;
  country?: string | null;
  currency?: string | null;
  rawUrl?: string | null;
  tags?: string[];
};

export function mapLegacyNormalizedToCanonical(input: BridgeMappingInput): CanonicalEvent {
  const canonicalOptions = {
    sourceCategory: input.sourceCategory,
    eventKind: input.eventKind,
    title: input.title,
    summary: input.summary,
    normalizedNarrative: input.normalizedNarrative,
    detectedAt: input.detectedAt,
    relatedAssets: input.relatedAssets,
    relatedTimeframes: input.relatedTimeframes,
    relevanceScore: input.relevanceScore ?? 0,
    sourceReliabilityScore: input.sourceReliabilityScore ?? 0,
    recencyScore: input.recencyScore ?? 0,
    ...(input.impact ? { impact: input.impact } : {}),
    ...(input.status ? { status: input.status } : {})
  };

  const canonical = mapInternalNormalizedEventToCanonicalEvent(input.legacyEvent, canonicalOptions);

  return {
    ...canonical,
    region: input.region ?? canonical.region,
    country: input.country ?? canonical.country,
    currency: input.currency ?? canonical.currency,
    rawUrl: input.rawUrl ?? canonical.rawUrl,
    tags: input.tags ?? canonical.tags
  };
}

export function mapQuoteToCanonical(quote: NormalizedMarketQuote, asset: CanonicalAssetSymbol, timeframe: Timeframe): CanonicalEvent {
  const legacy = normalizeEvent(quote);
  return mapLegacyNormalizedToCanonical({
    legacyEvent: legacy,
    sourceCategory: 'market_data',
    eventKind: 'price_action',
    title: `${asset} latest quote ${quote.last}`,
    summary: `Latest quote from ${quote.provider}.`,
    normalizedNarrative: `${asset} spot quote observed at ${quote.timestampUtc}.`,
    detectedAt: quote.timestampUtc,
    relatedAssets: [asset],
    relatedTimeframes: [timeframe],
    impact: 'medium',
    status: 'live',
    currency: asset.split('/')[1] ?? null,
    tags: ['market_quote', quote.provider]
  });
}

export function mapCandleToCanonical(candle: NormalizedCandle, asset: CanonicalAssetSymbol, timeframe: Timeframe): CanonicalEvent {
  const legacy = normalizeEvent(candle);
  return mapLegacyNormalizedToCanonical({
    legacyEvent: legacy,
    sourceCategory: 'market_data',
    eventKind: 'market_structure',
    title: `${asset} candle ${candle.timeframe}`,
    summary: `OHLC ${candle.open}/${candle.high}/${candle.low}/${candle.close}`,
    normalizedNarrative: `${asset} ${candle.timeframe} structure from ${candle.provider}.`,
    detectedAt: candle.timestampUtc,
    relatedAssets: [asset],
    relatedTimeframes: [timeframe],
    impact: 'low',
    status: 'published',
    currency: asset.split('/')[1] ?? null,
    tags: ['market_candle', candle.provider]
  });
}

export function mapMacroEventToCanonical(event: NormalizedMacroEvent, status: CanonicalEvent['status']): CanonicalEvent {
  const currency = mapCountryToCurrency(event.country);
  const assets = mapCurrencyToAssets(currency);
  const legacy = normalizeEvent(event);
  return mapLegacyNormalizedToCanonical({
    legacyEvent: legacy,
    sourceCategory: 'macro_calendar',
    eventKind: 'macro_calendar',
    title: `${event.country} ${event.indicatorName}`,
    summary: `Actual ${event.actual ?? 'n/a'} vs forecast ${event.forecast ?? 'n/a'}`,
    normalizedNarrative: `${event.indicatorName} release for ${event.country}.`,
    detectedAt: event.releaseTimeUtc,
    relatedAssets: assets,
    relatedTimeframes: ['M15', 'H1', 'H4'],
    impact: mapImpact(event.impactLevel),
    status,
    region: event.country,
    country: event.country,
    currency,
    tags: ['macro_event', event.provider]
  });
}

export function mapNewsArticleToCanonical(article: NormalizedNewsArticle, asset: CanonicalAssetSymbol): CanonicalEvent {
  const legacy = normalizeEvent(article);
  return mapLegacyNormalizedToCanonical({
    legacyEvent: legacy,
    sourceCategory: 'news',
    eventKind: 'news',
    title: article.headline,
    summary: article.summary,
    normalizedNarrative: article.summary || article.headline,
    detectedAt: article.publishedAtUtc,
    relatedAssets: article.mentionedAssets.length > 0 ? article.mentionedAssets : [asset],
    relatedTimeframes: ['M15', 'H1', 'H4'],
    impact: 'medium',
    status: 'published',
    region: 'GLOBAL',
    rawUrl: article.url,
    tags: ['news_article', article.provider]
  });
}

export function mapGeopoliticalEventToCanonical(event: NormalizedGeopoliticalEvent, asset: CanonicalAssetSymbol): CanonicalEvent {
  const legacy = normalizeEvent(event);
  return mapLegacyNormalizedToCanonical({
    legacyEvent: legacy,
    sourceCategory: 'geopolitics',
    eventKind: 'geopolitics',
    title: event.title,
    summary: event.summary,
    normalizedNarrative: event.summary,
    detectedAt: event.occurredAtUtc,
    relatedAssets: [asset],
    relatedTimeframes: ['H1', 'H4', 'D1'],
    impact: 'high',
    status: 'published',
    region: event.regionTags[0]?.toUpperCase() ?? 'GLOBAL',
    rawUrl: null,
    tags: ['geopolitical_event', event.provider]
  });
}

export function mapMacroContextRecordToCanonical(record: { providerId: string; country: string; metric: string; value: number; period: string }, asset: CanonicalAssetSymbol, asOf: string): CanonicalEvent {
  const fakeMacro: NormalizedMacroEvent = {
    type: 'macro_event',
    provider: record.providerId as NormalizedMacroEvent['provider'],
    eventId: `${record.providerId}-${record.country}-${record.metric}-${record.period}`,
    indicatorName: record.metric,
    country: record.country,
    releaseTimeUtc: asOf,
    actual: record.value,
    impactLevel: 'medium'
  };

  const legacy = normalizeEvent(fakeMacro);
  return mapLegacyNormalizedToCanonical({
    legacyEvent: legacy,
    sourceCategory: 'macro_context',
    eventKind: 'macro_context',
    title: `${record.country} ${record.metric}`,
    summary: `${record.metric}=${record.value} (${record.period})`,
    normalizedNarrative: `Macro context metric ${record.metric} for ${record.country}.`,
    detectedAt: asOf,
    relatedAssets: [asset],
    relatedTimeframes: ['H4', 'D1'],
    impact: 'medium',
    status: 'published',
    region: record.country,
    country: record.country,
    currency: mapCountryToCurrency(record.country),
    tags: ['macro_context', record.providerId]
  });
}

export function validateCanonicalBridgeEvent(event: CanonicalEvent, adapterName: string, droppedRecords: BridgeDroppedRecordDiagnostic[]): CanonicalEvent | null {
  const validation = validateCanonicalEvent(event);
  if ('errors' in validation) {
    droppedRecords.push({
      reason: 'invalid',
      adapterName,
      message: validation.errors.join('; '),
      eventId: event.id
    });
    return null;
  }
  return validation.value;
}
