import { KafkaIngestionPublishTransport, MemoryIngestionPublishTransport } from '../publish/transport';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

class PublisherMock {
  calls: Array<{ topic: string; key: string; payload: unknown }> = [];

  async publish(topic: string, key: string, payload: unknown): Promise<void> {
    this.calls.push({ topic, key, payload });
  }
}

export async function runPublishTransportTests(): Promise<void> {
  const memory = new MemoryIngestionPublishTransport();
  await memory.publish('ingestion.canonical.run.completed', '{"x":1}');
  assert(memory.listPublishedMessages().length === 1, 'memory transport should record published messages');

  const mock = new PublisherMock();
  const kafka = new KafkaIngestionPublishTransport(mock);
  await kafka.publish('ingestion.canonical.events.snapshot', '{"k":1}');

  assert(mock.calls.length === 1, 'kafka transport adapter should delegate publish calls to producer');
  assert(mock.calls[0]?.topic === 'ingestion.canonical.events.snapshot', 'kafka transport should preserve topic name');
}
