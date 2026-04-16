import { kafkaTopics } from '@elceo/config';
import type { GeopoliticsProvider } from '@elceo/providers';
import { normalizeEvent } from '../normalization/normalizeEvent';
import type { KafkaPublisher } from '../publishers/kafka-publisher';

export class GeopoliticsIngestionPipeline {
  constructor(private readonly provider: GeopoliticsProvider, private readonly publisher: KafkaPublisher) {}

  async ingest(query: string, fromIso: string, toIso: string): Promise<void> {
    const events = await this.provider.searchEvents(query, fromIso, toIso);

    for (const event of events) {
      await this.publisher.publish(kafkaTopics.sourceGeopoliticsRaw, event.eventId, event);
      await this.publisher.publish(kafkaTopics.eventNormalized, event.eventId, normalizeEvent(event));
    }
  }
}
