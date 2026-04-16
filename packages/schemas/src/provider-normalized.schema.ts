<<<<<<< HEAD
import type { ProviderId } from '@elceo/types';
import { toUtcIsoString } from './utc.schema';

export type NormalizedMarketQuote = {
  type: 'market_quote';
  provider: ProviderId;
  assetCode: string;
  bid?: number;
  ask?: number;
  last: number;
  timestampUtc: string;
};

export type NormalizedCandle = {
  type: 'market_candle';
  provider: ProviderId;
  assetCode: string;
  timeframe: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  timestampUtc: string;
};

export type NormalizedMacroEvent = {
  type: 'macro_event';
  provider: ProviderId;
  eventId: string;
  indicatorName: string;
  country: string;
  releaseTimeUtc: string;
  actual?: number;
  forecast?: number;
  previous?: number;
  impactLevel?: 'low' | 'medium' | 'high';
};

export type NormalizedNewsArticle = {
  type: 'news_article';
  provider: ProviderId;
  articleId: string;
  sourceName: string;
  url: string;
  headline: string;
  summary: string;
  publishedAtUtc: string;
  mentionedAssets: string[];
  dedupeKey: string;
};

export type NormalizedGeopoliticalEvent = {
  type: 'geopolitical_event';
  provider: ProviderId;
  eventId: string;
  title: string;
  summary: string;
  regionTags: string[];
  occurredAtUtc: string;
  dedupeKey: string;
};

export type NormalizedExtractedDocument = {
  type: 'extracted_document';
  provider: ProviderId;
  documentId: string;
  sourceUrl: string;
  extractedText: string;
  extractedAtUtc: string;
  documentClass: 'policy' | 'speech' | 'calendar' | 'report' | 'other';
};

export type NormalizedProviderEvent =
  | NormalizedMarketQuote
  | NormalizedCandle
  | NormalizedMacroEvent
  | NormalizedNewsArticle
  | NormalizedGeopoliticalEvent
  | NormalizedExtractedDocument;

export function ensureUtc<T extends { timestampUtc?: string; releaseTimeUtc?: string; publishedAtUtc?: string; occurredAtUtc?: string; extractedAtUtc?: string }>(
  input: T
): T {
  const clone = { ...input };
  if (clone.timestampUtc) clone.timestampUtc = toUtcIsoString(clone.timestampUtc);
  if (clone.releaseTimeUtc) clone.releaseTimeUtc = toUtcIsoString(clone.releaseTimeUtc);
  if (clone.publishedAtUtc) clone.publishedAtUtc = toUtcIsoString(clone.publishedAtUtc);
  if (clone.occurredAtUtc) clone.occurredAtUtc = toUtcIsoString(clone.occurredAtUtc);
  if (clone.extractedAtUtc) clone.extractedAtUtc = toUtcIsoString(clone.extractedAtUtc);
  return clone;
}
=======
export {};
>>>>>>> origin/main
