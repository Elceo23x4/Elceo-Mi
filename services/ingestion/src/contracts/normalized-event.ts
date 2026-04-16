import type { InternalNormalizedEvent } from '@elceo/schemas';

export type NormalizedIngestionEnvelope = {
  traceId: string;
  ingestedAtUtc: string;
  event: InternalNormalizedEvent;
};
