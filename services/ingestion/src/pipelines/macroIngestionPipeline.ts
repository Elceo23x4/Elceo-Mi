import { kafkaTopics } from '@elceo/config';
import type { InternalNormalizedEvent } from '@elceo/schemas';
import type { MacroCalendarProvider } from '@elceo/providers';
import { normalizeEvent } from '../normalization/normalizeEvent';
import type { KafkaPublisher } from '../publishers/kafka-publisher';

export class MacroIngestionPipeline {
  constructor(private readonly provider: MacroCalendarProvider, private readonly publisher: KafkaPublisher) {}

  async ingestWindow(startIso: string, endIso: string): Promise<InternalNormalizedEvent[]> {
    const events = await this.provider.getCalendar(startIso, endIso);
    const normalized: InternalNormalizedEvent[] = [];

    for (const event of events) {
      const normalizedEvent = normalizeEvent(event);
      normalized.push(normalizedEvent);
      await this.publisher.publish(kafkaTopics.sourceMacroRaw, event.eventId, event);
      await this.publisher.publish(kafkaTopics.eventNormalized, event.eventId, normalizedEvent);
    }

    return normalized;
  }
}
