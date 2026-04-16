import type { KafkaTopic } from '@elceo/config';

export interface KafkaPublisher {
  publish<T>(topic: KafkaTopic, key: string, payload: T): Promise<void>;
}

export class ConsoleKafkaPublisher implements KafkaPublisher {
  async publish<T>(topic: KafkaTopic, key: string, payload: T): Promise<void> {
    console.info('[kafka.publish]', { topic, key, payload });
  }
}
