import { kafkaTopics } from '@elceo/config';
import type { MacroCalendarProvider } from '@elceo/providers';
import { normalizeEvent } from '../normalization/normalizeEvent';
import type { KafkaPublisher } from '../publishers/kafka-publisher';

export class MacroIngestionPipeline {
  constructor(private readonly provider: MacroCalendarProvider, private readonly publisher: KafkaPublisher) {}

  async ingestWindow(startIso: string, endIso: string): Promise<void> {
    const events = await this.provider.getCalendar(startIso, endIso);

    for (const event of events) {
      await this.publisher.publish(kafkaTopics.sourceMacroRaw, event.eventId, event);
      await this.publisher.publish(kafkaTopics.eventNormalized, event.eventId, normalizeEvent(event));
    }
  }
}
