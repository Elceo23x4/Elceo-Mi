import { kafkaTopics } from '@elceo/config';
import type { InternalNormalizedEvent } from '@elceo/schemas';
import type { GeopoliticsProvider } from '@elceo/providers';
import { normalizeEvent } from '../normalization/normalizeEvent';
import type { KafkaPublisher } from '../publishers/kafka-publisher';

export class GeopoliticsIngestionPipeline {
  constructor(private readonly provider: GeopoliticsProvider, private readonly publisher: KafkaPublisher) {}

  async ingest(query: string, fromIso: string, toIso: string): Promise<InternalNormalizedEvent[]> {
    const events = await this.provider.searchEvents(query, fromIso, toIso);
    const normalized: InternalNormalizedEvent[] = [];

    for (const event of events) {
      const normalizedEvent = normalizeEvent(event);
      normalized.push(normalizedEvent);
      await this.publisher.publish(kafkaTopics.sourceGeopoliticsRaw, event.eventId, event);
      await this.publisher.publish(kafkaTopics.eventNormalized, event.eventId, normalizedEvent);
    }

    return normalized;
  }
}
