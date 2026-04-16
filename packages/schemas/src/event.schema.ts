<<<<<<< HEAD
import type { NormalizedProviderEvent } from './provider-normalized.schema';

export type InternalNormalizedEvent = {
  eventId: string;
  eventType: NormalizedProviderEvent['type'];
  sourceProvider: string;
  occurredAtUtc: string;
  dedupeKey: string;
  payload: NormalizedProviderEvent;
};
=======
export {};
>>>>>>> origin/main
