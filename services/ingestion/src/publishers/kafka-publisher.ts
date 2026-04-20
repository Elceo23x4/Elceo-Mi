import type { KafkaTopic } from '@elceo/config';

export interface KafkaPublisher {
  publish<T>(topic: KafkaTopic, key: string, payload: T): Promise<void>;
}

export interface KafkaConsumer {
  subscribe(topic: KafkaTopic, handler: KafkaHandler): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export type KafkaHandler<T = unknown> = (record: { topic: KafkaTopic; key: string; payload: T }) => Promise<void> | void;

export class InMemoryKafkaBus implements KafkaPublisher, KafkaConsumer {
  private handlers = new Map<KafkaTopic, KafkaHandler[]>();

  async subscribe(topic: KafkaTopic, handler: KafkaHandler): Promise<void> {
    const existing = this.handlers.get(topic) ?? [];
    existing.push(handler);
    this.handlers.set(topic, existing);
  }

  async start(): Promise<void> {
    // no-op for local fallback path
  }

  async stop(): Promise<void> {
    // no-op for local fallback path
  }

  async publish<T>(topic: KafkaTopic, key: string, payload: T): Promise<void> {
    const handlers = this.handlers.get(topic) ?? [];
    await Promise.all(handlers.map((handler) => handler({ topic, key, payload })));
  }
}

type KafkaJsModule = typeof import('kafkajs');
type RealKafkaClientOptions = {
  brokers: string[];
  clientId: string;
  groupId: string;
  useSsl: boolean;
  saslUsername?: string;
  saslPassword?: string;
};

export class KafkaJsPublisher implements KafkaPublisher {
  private producer: any | null = null;

  constructor(private readonly options: RealKafkaClientOptions, private readonly kafkaJs: KafkaJsModule) {}

  private async getProducer(): Promise<any> {
    if (this.producer) return this.producer;

    const kafka = new this.kafkaJs.Kafka({
      clientId: this.options.clientId,
      brokers: this.options.brokers,
      ssl: this.options.useSsl,
      ...(this.options.saslUsername && this.options.saslPassword
        ? {
            sasl: {
              mechanism: 'plain' as const,
              username: this.options.saslUsername,
              password: this.options.saslPassword
            }
          }
        : {})
    });

    this.producer = kafka.producer();
    await this.producer.connect();

    return this.producer;
  }

  async publish<T>(topic: KafkaTopic, key: string, payload: T): Promise<void> {
    const producer = await this.getProducer();

    await producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(payload) }]
    });
  }

  async disconnect(): Promise<void> {
    if (!this.producer) return;
    await this.producer.disconnect();
    this.producer = null;
  }
}

export class KafkaJsConsumer implements KafkaConsumer {
  private readonly kafka: any;
  private readonly consumer: any;
  private readonly handlers = new Map<KafkaTopic, KafkaHandler[]>();
  private readonly subscribedTopics = new Set<KafkaTopic>();
  private isConnected = false;

  constructor(private readonly options: RealKafkaClientOptions, private readonly kafkaJs: KafkaJsModule) {
    this.kafka = new this.kafkaJs.Kafka({
      clientId: this.options.clientId,
      brokers: this.options.brokers,
      ssl: this.options.useSsl,
      ...(this.options.saslUsername && this.options.saslPassword
        ? {
            sasl: {
              mechanism: 'plain' as const,
              username: this.options.saslUsername,
              password: this.options.saslPassword
            }
          }
        : {})
    });
    this.consumer = this.kafka.consumer({ groupId: this.options.groupId });
  }

  async subscribe(topic: KafkaTopic, handler: KafkaHandler): Promise<void> {
    const existing = this.handlers.get(topic) ?? [];
    existing.push(handler);
    this.handlers.set(topic, existing);

    if (this.isConnected && !this.subscribedTopics.has(topic)) {
      await this.consumer.subscribe({ topic, fromBeginning: false });
      this.subscribedTopics.add(topic);
    }
  }

  async start(): Promise<void> {
    if (!this.isConnected) {
      await this.consumer.connect();
      this.isConnected = true;
    }

    for (const topic of this.handlers.keys()) {
      if (this.subscribedTopics.has(topic)) continue;
      await this.consumer.subscribe({ topic, fromBeginning: false });
      this.subscribedTopics.add(topic);
    }
    await this.consumer.run({
      eachMessage: async ({ topic, message }: { topic: string; message: { key?: { toString(): string } | null; value?: { toString(): string } | null } }) => {
        const topicKey = topic as KafkaTopic;
        const handlers = this.handlers.get(topicKey) ?? [];
        if (!handlers.length) return;

        const key = message.key?.toString() ?? '';
        const payloadRaw = message.value?.toString() ?? 'null';
        const payload = JSON.parse(payloadRaw) as unknown;

        await Promise.all(handlers.map((handler) => handler({ topic: topicKey, key, payload })));
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.isConnected) return;
    await this.consumer.disconnect();
    this.isConnected = false;
    this.subscribedTopics.clear();
  }
}

export type KafkaTransport = {
  publisher: KafkaPublisher;
  consumer: KafkaConsumer;
  mode: 'kafka' | 'in-memory';
};

async function loadKafkaJs(): Promise<KafkaJsModule | null> {
  try {
    const mod = await import('kafkajs');
    return mod;
  } catch {
    return null;
  }
}


export async function createKafkaTransport(env: Record<string, string | undefined>): Promise<KafkaTransport> {
  const brokers = env.KAFKA_BROKERS?.split(',').map((broker) => broker.trim()).filter(Boolean) ?? [];
  const clientId = env.KAFKA_CLIENT_ID ?? 'elceo';
  const groupId = env.KAFKA_GROUP_ID_INGESTION ?? 'elceo-ingestion';
  const useKafka = env.ENABLE_KAFKA !== 'false' && brokers.length > 0;

  if (!useKafka) {
    const bus = new InMemoryKafkaBus();
    return { publisher: bus, consumer: bus, mode: 'in-memory' };
  }

  const kafkaJs = await loadKafkaJs();
  if (!kafkaJs) {
    const bus = new InMemoryKafkaBus();
    return { publisher: bus, consumer: bus, mode: 'in-memory' };
  }

  const options: RealKafkaClientOptions = {
    brokers,
    clientId,
    groupId,
    useSsl: env.KAFKA_SSL === 'true',
    ...(env.KAFKA_SASL_USERNAME ? { saslUsername: env.KAFKA_SASL_USERNAME } : {}),
    ...(env.KAFKA_SASL_PASSWORD ? { saslPassword: env.KAFKA_SASL_PASSWORD } : {})
  };

  return {
    publisher: new KafkaJsPublisher(options, kafkaJs),
    consumer: new KafkaJsConsumer(options, kafkaJs),
    mode: 'kafka'
  };
}
