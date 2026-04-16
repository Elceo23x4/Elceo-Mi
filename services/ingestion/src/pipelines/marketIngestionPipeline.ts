import { kafkaTopics } from '@elceo/config';
import type { InternalNormalizedEvent } from '@elceo/schemas';
import type { MarketDataProvider } from '@elceo/providers';
import { normalizeEvent } from '../normalization/normalizeEvent';
import type { KafkaPublisher } from '../publishers/kafka-publisher';

export class MarketIngestionPipeline {
  constructor(private readonly provider: MarketDataProvider, private readonly publisher: KafkaPublisher) {}

  async ingestAsset(assetCode: string): Promise<InternalNormalizedEvent[]> {
    const normalized: InternalNormalizedEvent[] = [];

    const quote = await this.provider.getLatestQuote(assetCode);
    if (quote) {
      await this.publisher.publish(kafkaTopics.sourceMarketRaw, assetCode, quote);
      const normalizedQuote = normalizeEvent(quote);
      normalized.push(normalizedQuote);
      await this.publisher.publish(kafkaTopics.eventNormalized, quote.assetCode, normalizedQuote);
    }

    const toIso = new Date().toISOString();
    const fromIso = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const candles = await this.provider.getCandles(assetCode, '240', fromIso, toIso);

    for (const candle of candles.slice(-24)) {
      const normalizedCandle = normalizeEvent(candle);
      normalized.push(normalizedCandle);
      await this.publisher.publish(kafkaTopics.sourceMarketRaw, `${assetCode}-candle`, candle);
      await this.publisher.publish(kafkaTopics.eventNormalized, `${assetCode}-candle`, normalizedCandle);
    }

    return normalized;
  }
}
