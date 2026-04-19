import type { EvidenceAssembly, EvidenceItem } from '@elceo/types';
import type { InternalNormalizedEvent } from '@elceo/schemas';

export function assembleEvidence(assetCode: string, events: InternalNormalizedEvent[]): EvidenceAssembly {
  const evidence: EvidenceItem[] = events.map((event) => ({
    evidenceId: `${event.eventId}::${assetCode}`,
    eventClass: event.eventType,
    provider: event.sourceProvider as EvidenceItem['provider'],
    occurredAtUtc: event.occurredAtUtc,
    summary: `${event.eventType} from ${event.sourceProvider}`,
    relatedAssetCodes: [assetCode]
  }));

  return {
    assemblyId: `${assetCode}::${new Date().toISOString()}`,
    assetCode,
    assembledAtUtc: new Date().toISOString(),
    evidence,
    supportingEventIds: events.map((item) => item.eventId),
    contradictoryEventIds: []
  };
}
