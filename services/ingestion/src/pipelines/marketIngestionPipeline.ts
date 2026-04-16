import { kafkaTopics } from '@elceo/config';
import type { MarketDataProvider } from '@elceo/providers';
import { normalizeEvent } from '../normalization/normalizeEvent';
import type { KafkaPublisher } from '../publishers/kafka-publisher';

export class MarketIngestionPipeline {
  constructor(private readonly provider: MarketDataProvider, private readonly publisher: KafkaPublisher) {}

  async ingestLatestQuote(assetCode: string): Promise<void> {
    const quote = await this.provider.getLatestQuote(assetCode);
    if (!quote) return;

    await this.publisher.publish(kafkaTopics.sourceMarketRaw, assetCode, quote);
    await this.publisher.publish(kafkaTopics.eventNormalized, quote.assetCode, normalizeEvent(quote));
  }
}
