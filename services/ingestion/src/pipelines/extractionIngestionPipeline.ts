import { kafkaTopics } from '@elceo/config';
import type { CrawlerProvider } from '@elceo/providers';
import { normalizeEvent } from '../normalization/normalizeEvent';
import type { KafkaPublisher } from '../publishers/kafka-publisher';

export class ExtractionIngestionPipeline {
  constructor(
    private readonly primaryProvider: CrawlerProvider,
    private readonly fallbackProvider: CrawlerProvider,
    private readonly publisher: KafkaPublisher
  ) {}

  async ingest(url: string): Promise<void> {
    const document = (await this.primaryProvider.extract(url)) ?? (await this.fallbackProvider.extract(url));
    if (!document) return;

    await this.publisher.publish(kafkaTopics.sourceCrawlRaw, document.documentId, document);
    await this.publisher.publish(kafkaTopics.eventNormalized, document.documentId, normalizeEvent(document));
  }
}
