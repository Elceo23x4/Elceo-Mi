import type { KafkaTopic } from '@elceo/config';

export type KafkaEnvelope<T> = {
  topic: KafkaTopic;
  key: string;
  timestampUtc: string;
  payload: T;
  traceId: string;
};
