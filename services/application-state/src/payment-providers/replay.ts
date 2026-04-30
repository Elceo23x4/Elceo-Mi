import type { BillingExternalProviderKind } from '@elceo/types';
import type { ExternalBillingEventRepository } from '../persistence';
import { deserializeExternalEventPayload } from './serialization';
export class ExternalEventReplayService {
  constructor(private readonly events: ExternalBillingEventRepository) {}
  async getExternalEventReplay(providerKind: BillingExternalProviderKind, externalEventId: string) {
    const event = await this.events.getEvent(providerKind, externalEventId);
    if (!event) return null;
    return { ...event, payload: deserializeExternalEventPayload(event.payloadJson) };
  }
  async listExternalEventReplaysForSubject(subjectKind: 'user', subjectId: string, limit?: number) {
    const events = await this.events.listEventsForSubject(subjectKind, subjectId, limit);
    return events.map((event) => ({ ...event, payload: deserializeExternalEventPayload(event.payloadJson) }));
  }
}
