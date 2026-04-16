<<<<<<< HEAD
import type { NormalizedGeopoliticalEvent } from '@elceo/schemas';

export interface GeopoliticsProvider {
  readonly providerId: string;
  searchEvents(query: string, fromIso: string, toIso: string): Promise<NormalizedGeopoliticalEvent[]>;
}
=======
export {};
>>>>>>> origin/main
