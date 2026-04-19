import type { ProviderId } from './provider';

export type EventClass =
  | 'market_quote'
  | 'market_candle'
  | 'macro_event'
  | 'news_article'
  | 'geopolitical_event'
  | 'extracted_document';

export type EvidenceItem = {
  evidenceId: string;
  eventClass: EventClass;
  provider: ProviderId;
  occurredAtUtc: string;
  summary: string;
  scoreHint?: number;
  relatedAssetCodes: string[];
};

export type EvidenceAssembly = {
  assemblyId: string;
  assetCode: string;
  assembledAtUtc: string;
  evidence: EvidenceItem[];
  supportingEventIds: string[];
  contradictoryEventIds: string[];
};
