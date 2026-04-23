import { createKafkaTransport } from '../publishers/kafka-publisher';
import type { KafkaPublisher } from '../publishers/kafka-publisher';
import type { KafkaTopic } from '@elceo/config';
import type { IngestionPublishTopic } from './topic-contracts';

export type IngestionPublishTransport = {
  name: string;
  publish(topic: IngestionPublishTopic, payloadJson: string): Promise<void>;
};

export type MemoryPublishedRecord = {
  topic: IngestionPublishTopic;
  payloadJson: string;
};

export class MemoryIngestionPublishTransport implements IngestionPublishTransport {
  readonly name = 'memory';
  private readonly publishedMessages: MemoryPublishedRecord[] = [];

  async publish(topic: IngestionPublishTopic, payloadJson: string): Promise<void> {
    this.publishedMessages.push({ topic, payloadJson });
  }

  listPublishedMessages(): MemoryPublishedRecord[] {
    return [...this.publishedMessages];
  }
}

export class KafkaIngestionPublishTransport implements IngestionPublishTransport {
  readonly name = 'kafka';

  constructor(private readonly publisher: KafkaPublisher) {}

  async publish(topic: IngestionPublishTopic, payloadJson: string): Promise<void> {
    const payload = JSON.parse(payloadJson) as unknown;
    await this.publisher.publish(topic as unknown as KafkaTopic, topic, payload);
  }
}

export async function createIngestionPublishTransport(env: Record<string, string | undefined>): Promise<IngestionPublishTransport> {
  const kafkaTransport = await createKafkaTransport(env);
  if (kafkaTransport.mode === 'kafka') {
    return new KafkaIngestionPublishTransport(kafkaTransport.publisher);
  }

  return new MemoryIngestionPublishTransport();
}
