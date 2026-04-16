import type { KafkaTopic } from '@elceo/config';

export interface KafkaPublisher {
  publish<T>(topic: KafkaTopic, key: string, payload: T): Promise<void>;
}

export type KafkaHandler<T = unknown> = (record: { topic: KafkaTopic; key: string; payload: T }) => Promise<void> | void;

export class InMemoryKafkaBus implements KafkaPublisher {
  private handlers = new Map<KafkaTopic, KafkaHandler[]>();

  subscribe(topic: KafkaTopic, handler: KafkaHandler): void {
    const existing = this.handlers.get(topic) ?? [];
    existing.push(handler);
    this.handlers.set(topic, existing);
  }

  async publish<T>(topic: KafkaTopic, key: string, payload: T): Promise<void> {
    const handlers = this.handlers.get(topic) ?? [];
    await Promise.all(handlers.map((handler) => handler({ topic, key, payload })));
  }
}

export class ConsoleKafkaPublisher implements KafkaPublisher {
  async publish<T>(topic: KafkaTopic, key: string, payload: T): Promise<void> {
    console.info('[kafka.publish]', { topic, key, payload });
  }
}
