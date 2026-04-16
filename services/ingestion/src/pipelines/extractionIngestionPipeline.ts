import { kafkaTopics } from '@elceo/config';
import type { InternalNormalizedEvent } from '@elceo/schemas';
import type { CrawlerProvider } from '@elceo/providers';
import { normalizeEvent } from '../normalization/normalizeEvent';
import type { KafkaPublisher } from '../publishers/kafka-publisher';

export class ExtractionIngestionPipeline {
  constructor(
    private readonly primaryProvider: CrawlerProvider,
    private readonly fallbackProvider: CrawlerProvider,
    private readonly publisher: KafkaPublisher
  ) {}

  async ingest(url: string): Promise<InternalNormalizedEvent[]> {
    const document = (await this.primaryProvider.extract(url)) ?? (await this.fallbackProvider.extract(url));
    if (!document) return [];

    const normalizedDocument = normalizeEvent(document);
    await this.publisher.publish(kafkaTopics.sourceCrawlRaw, document.documentId, document);
    await this.publisher.publish(kafkaTopics.eventNormalized, document.documentId, normalizedDocument);

    return [normalizedDocument];
  }
}
